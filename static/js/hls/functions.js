$(document).ready(function () {
    console.log('Initial enableStreaming value:', $('#enableStreaming').prop('checked'));
});

$('#enableStreaming').click(function () {
    console.log('enableStreaming clicked');
    enableStreaming = $(this).prop('checked');
    loadSelectedStream();
});

function loadSelectedStream() {
    $('#statusOut,#errorOut').empty();
    if (!Hls.isSupported()) {
        handleUnsupported();
        return;
    }
    url = $('#streamURL').val();
    setupGlobals();
    hideCanvas();
    if (hls) {
        hls.destroy();
        clearInterval(hls.bufferTimer);
        hls = null;
    }
    if (!enableStreaming) {
        logStatus('Streaming disabled');
        return;
    }
    logStatus('Loading ' + url);

    // Extending both a demo-specific config and the user config which can override all
    var hlsConfig = $.extend({}, hlsjsDefaults, getEditorValue({
        parse: true
    }));
    if (selectedTestStream && selectedTestStream.config) {
        console.info('[loadSelectedStream] extending hls config with stream-specific config: ', selectedTestStream.config);
        $.extend(hlsConfig, selectedTestStream.config);
        updateConfigEditorValue(hlsConfig);
    }
    onDemoConfigChanged(true);
    console.log('Using Hls.js config:', hlsConfig);
    self.hls = hls = new Hls(hlsConfig);
    logStatus('Loading manifest and attaching video element...');
    var expiredTracks = [].filter.call(video.textTracks, function (track) {
        return track.kind !== 'metadata';
    });
    if (expiredTracks.length) {
        var kinds = expiredTracks.map(function (track) {
            return track.kind;
        }).filter(function (kind, index, self) {
            return self.indexOf(kind) === index;
        });
        logStatus("Replacing video element to remove " + kinds.join(' and ') + " text tracks");
        var videoWithExpiredTextTracks = video;
        video = videoWithExpiredTextTracks.cloneNode(false);
        video.removeAttribute('src');
        video.volume = videoWithExpiredTextTracks.volume;
        video.muted = videoWithExpiredTextTracks.muted;
        videoWithExpiredTextTracks.parentNode.insertBefore(video, videoWithExpiredTextTracks);
        videoWithExpiredTextTracks.parentNode.removeChild(videoWithExpiredTextTracks);
    }
    addChartEventListeners(hls);
    addVideoEventListeners(video);
    hls.loadSource(url);
    hls.autoLevelCapping = levelCapping;
    hls.attachMedia(video);
    hls.on(Hls.Events.MEDIA_ATTACHED, function () {
        logStatus('Media element attached');
        bufferingIdx = -1;
        events.video.push({
            time: self.performance.now() - events.t0,
            type: 'Media attached'
        });
        trimEventHistory();
    });
    hls.on(Hls.Events.MEDIA_DETACHED, function () {
        logStatus('Media element detached');
        clearInterval(hls.bufferTimer);
        bufferingIdx = -1;
        tracks = [];
        events.video.push({
            time: self.performance.now() - events.t0,
            type: 'Media detached'
        });
        trimEventHistory();
    });
    hls.on(Hls.Events.DESTROYING, function () {
        clearInterval(hls.bufferTimer);
    });
    hls.on(Hls.Events.BUFFER_RESET, function () {
        clearInterval(hls.bufferTimer);
    });
    hls.on(Hls.Events.FRAG_PARSING_INIT_SEGMENT, function (eventName, data) {
        showCanvas();
        events.video.push({
            time: self.performance.now() - events.t0,
            type: data.id + ' init segment'
        });
        trimEventHistory();
    });
    hls.on(Hls.Events.FRAG_PARSING_METADATA, function (eventName, data) {
        // console.log("Id3 samples ", data.samples);
    });
    hls.on(Hls.Events.LEVEL_SWITCHING, function (eventName, data) {
        events.level.push({
            time: self.performance.now() - events.t0,
            id: data.level,
            bitrate: Math.round(hls.levels[data.level].bitrate / 1000)
        });
        trimEventHistory();
        updateLevelInfo();
    });
    hls.on(Hls.Events.MANIFEST_PARSED, function (eventName, data) {
        events.load.push({
            type: 'manifest',
            name: '',
            start: 0,
            end: data.levels.length,
            time: data.stats.loading.start - events.t0,
            latency: data.stats.loading.first - data.stats.loading.start,
            load: data.stats.loading.end - data.stats.loading.first,
            duration: data.stats.loading.end - data.stats.loading.first
        });
        trimEventHistory();
        self.refreshCanvas();
    });
    hls.on(Hls.Events.MANIFEST_PARSED, function (eventName, data) {
        logStatus(hls.levels.length + " quality levels found");
        logStatus('Manifest successfully loaded');
        stats = {
            levelNb: data.levels.length,
            levelParsed: 0
        };
        trimEventHistory();
        updateLevelInfo();
    });
    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, function (eventName, data) {
        logStatus('No of audio tracks found: ' + data.audioTracks.length);
        updateAudioTrackInfo();
    });
    hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, function (eventName, data) {
        logStatus('Audio track switching...');
        updateAudioTrackInfo();
        events.video.push({
            time: self.performance.now() - events.t0,
            type: 'audio switching',
            name: '@' + data.id
        });
        trimEventHistory();
        lastAudioTrackSwitchingIdx = events.video.length - 1;
    });
    hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, function (eventName, data) {
        logStatus('Audio track switched');
        updateAudioTrackInfo();
        var event = {
            time: self.performance.now() - events.t0,
            type: 'audio switched',
            name: '@' + data.id
        };
        if (lastAudioTrackSwitchingIdx !== undefined) {
            events.video[lastAudioTrackSwitchingIdx].duration = event.time - events.video[lastAudioTrackSwitchingIdx].time;
            lastAudioTrackSwitchingIdx = undefined;
        }
        events.video.push(event);
        trimEventHistory();
    });
    hls.on(Hls.Events.LEVEL_LOADED, function (eventName, data) {
        events.isLive = data.details.live;
        var event = {
            type: 'level',
            id: data.level,
            start: data.details.startSN,
            end: data.details.endSN,
            time: data.stats.loading.start - events.t0,
            latency: data.stats.loading.first - data.stats.loading.start,
            load: data.stats.loading.end - data.stats.loading.first,
            parsing: data.stats.parsing.end - data.stats.loading.end,
            duration: data.stats.loading.end - data.stats.loading.first
        };
        var parsingDuration = data.stats.parsing.end - data.stats.loading.end;
        if (stats.levelParsed) {
            this.sumLevelParsingMs += parsingDuration;
        } else {
            this.sumLevelParsingMs = parsingDuration;
        }
        stats.levelParsed++;
        stats.levelParsingUs = Math.round(1000 * this.sumLevelParsingMs / stats.levelParsed);

        // console.log('parsing level duration :' + stats.levelParsingUs + 'us,count:' + stats.levelParsed);

        events.load.push(event);
        trimEventHistory();
        self.refreshCanvas();
    });
    hls.on(Hls.Events.AUDIO_TRACK_LOADED, function (eventName, data) {
        events.isLive = data.details.live;
        var event = {
            type: 'audio track',
            id: data.id,
            start: data.details.startSN,
            end: data.details.endSN,
            time: data.stats.loading.start - events.t0,
            latency: data.stats.loading.first - data.stats.loading.start,
            load: data.stats.loading.end - data.stats.loading.first,
            parsing: data.stats.parsing.end - data.stats.loading.end,
            duration: data.stats.loading.end - data.stats.loading.first
        };
        events.load.push(event);
        trimEventHistory();
        self.refreshCanvas();
    });
    hls.on(Hls.Events.FRAG_BUFFERED, function (eventName, data) {
        var stats = data.part && data.part.stats && data.part.stats.loaded ? data.part.stats : data.frag.stats;
        if (data.stats.aborted) {
            console.assert('Aborted request being buffered.', data);
            return;
        }
        var event = {
            type: data.frag.type + (data.part ? ' part' : ' fragment'),
            id: data.frag.level,
            id2: data.frag.sn,
            id3: data.part ? data.part.index : undefined,
            time: data.stats.loading.start - events.t0,
            latency: data.stats.loading.first - data.stats.loading.start,
            load: data.stats.loading.end - data.stats.loading.first,
            parsing: data.stats.parsing.end - data.stats.loading.end,
            buffer: data.stats.buffering.end - data.stats.parsing.end,
            duration: data.stats.buffering.end - data.stats.loading.first,
            bw: Math.round(8 * data.stats.total / (data.stats.buffering.end - data.stats.loading.start)),
            // bandwidth of this fragment
            ewma: Math.round(hls.bandwidthEstimate / 1000),
            // estimated bandwidth
            size: data.stats.total
        };
        events.load.push(event);
        events.bitrate.push({
            time: self.performance.now() - events.t0,
            bitrate: event.bw,
            ewma: event.ewma,
            duration: data.frag.duration,
            level: event.id
        });
        if (events.buffer.length === 0) {
            events.buffer.push({
                time: 0,
                buffer: 0,
                pos: 0
            });
        }
        clearInterval(hls.bufferTimer);
        hls.bufferTimer = self.setInterval(checkBuffer, 100);
        trimEventHistory();
        self.refreshCanvas();
        updateLevelInfo();
        var latency = data.stats.loading.first - data.stats.loading.start;
        var parsing = data.stats.parsing.end - data.stats.loading.end;
        var process = data.stats.buffering.end - data.stats.loading.start;
        var bitrate = Math.round(8 * data.stats.total / (data.stats.buffering.end - data.stats.loading.first));
        if (stats.fragBuffered) {
            stats.fragMinLatency = Math.min(stats.fragMinLatency, latency);
            stats.fragMaxLatency = Math.max(stats.fragMaxLatency, latency);
            stats.fragMinProcess = Math.min(stats.fragMinProcess, process);
            stats.fragMaxProcess = Math.max(stats.fragMaxProcess, process);
            stats.fragMinKbps = Math.min(stats.fragMinKbps, bitrate);
            stats.fragMaxKbps = Math.max(stats.fragMaxKbps, bitrate);
            stats.autoLevelCappingMin = Math.min(stats.autoLevelCappingMin, hls.autoLevelCapping);
            stats.autoLevelCappingMax = Math.max(stats.autoLevelCappingMax, hls.autoLevelCapping);
            stats.fragBuffered++;
        } else {
            stats.fragMinLatency = stats.fragMaxLatency = latency;
            stats.fragMinProcess = stats.fragMaxProcess = process;
            stats.fragMinKbps = stats.fragMaxKbps = bitrate;
            stats.fragBuffered = 1;
            stats.fragBufferedBytes = 0;
            stats.autoLevelCappingMin = stats.autoLevelCappingMax = hls.autoLevelCapping;
            this.sumLatency = 0;
            this.sumKbps = 0;
            this.sumProcess = 0;
            this.sumParsing = 0;
        }
        stats.fraglastLatency = latency;
        this.sumLatency += latency;
        stats.fragAvgLatency = Math.round(this.sumLatency / stats.fragBuffered);
        stats.fragLastProcess = process;
        this.sumProcess += process;
        this.sumParsing += parsing;
        stats.fragAvgProcess = Math.round(this.sumProcess / stats.fragBuffered);
        stats.fragLastKbps = bitrate;
        this.sumKbps += bitrate;
        stats.fragAvgKbps = Math.round(this.sumKbps / stats.fragBuffered);
        stats.fragBufferedBytes += data.stats.total;
        stats.fragparsingKbps = Math.round(8 * stats.fragBufferedBytes / this.sumParsing);
        stats.fragparsingMs = Math.round(this.sumParsing);
        stats.autoLevelCappingLast = hls.autoLevelCapping;
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, function (eventName, data) {
        var event = {
            time: self.performance.now() - events.t0,
            type: 'level switched',
            name: data.level
        };
        events.video.push(event);
        trimEventHistory();
        self.refreshCanvas();
        updateLevelInfo();
    });
    hls.on(Hls.Events.FRAG_CHANGED, function (eventName, data) {
        var event = {
            time: self.performance.now() - events.t0,
            type: 'frag changed',
            name: data.frag.sn + ' @ ' + data.frag.level
        };
        events.video.push(event);
        trimEventHistory();
        self.refreshCanvas();
        updateLevelInfo();
        stats.tagList = data.frag.tagList;
        var level = data.frag.level;
        var autoLevel = hls.autoLevelEnabled;
        if (stats.levelStart === undefined) {
            stats.levelStart = level;
        }
        stats.fragProgramDateTime = data.frag.programDateTime;
        stats.fragStart = data.frag.start;
        if (autoLevel) {
            if (stats.fragChangedAuto) {
                stats.autoLevelMin = Math.min(stats.autoLevelMin, level);
                stats.autoLevelMax = Math.max(stats.autoLevelMax, level);
                stats.fragChangedAuto++;
                if (this.levelLastAuto && level !== stats.autoLevelLast) {
                    stats.autoLevelSwitch++;
                }
            } else {
                stats.autoLevelMin = stats.autoLevelMax = level;
                stats.autoLevelSwitch = 0;
                stats.fragChangedAuto = 1;
                this.sumAutoLevel = 0;
            }
            this.sumAutoLevel += level;
            stats.autoLevelAvg = Math.round(1000 * this.sumAutoLevel / stats.fragChangedAuto) / 1000;
            stats.autoLevelLast = level;
        } else {
            if (stats.fragChangedManual) {
                stats.manualLevelMin = Math.min(stats.manualLevelMin, level);
                stats.manualLevelMax = Math.max(stats.manualLevelMax, level);
                stats.fragChangedManual++;
                if (!this.levelLastAuto && level !== stats.manualLevelLast) {
                    stats.manualLevelSwitch++;
                }
            } else {
                stats.manualLevelMin = stats.manualLevelMax = level;
                stats.manualLevelSwitch = 0;
                stats.fragChangedManual = 1;
            }
            stats.manualLevelLast = level;
        }
        this.levelLastAuto = autoLevel;
    });
    hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, function (eventName, data) {
        if (stats) {
            if (stats.fragLoadEmergencyAborted === undefined) {
                stats.fragLoadEmergencyAborted = 1;
            } else {
                stats.fragLoadEmergencyAborted++;
            }
        }
    });
    hls.on(Hls.Events.FRAG_DECRYPTED, function (eventName, data) {
        if (!stats.fragDecrypted) {
            stats.fragDecrypted = 0;
            this.totalDecryptTime = 0;
            stats.fragAvgDecryptTime = 0;
        }
        stats.fragDecrypted++;
        this.totalDecryptTime += data.stats.tdecrypt - data.stats.tstart;
        stats.fragAvgDecryptTime = this.totalDecryptTime / stats.fragDecrypted;
    });
    hls.on(Hls.Events.ERROR, function (eventName, data) {
        console.warn('Error event:', data);
        switch (data.details) {
            case Hls.ErrorDetails.MANIFEST_LOAD_ERROR:
                try {
                    $('#errorOut').html('Cannot load <a href="' + data.context.url + '">' + url + '</a><br>HTTP response code:' + data.response.code + ' <br>' + data.response.text);
                    if (data.response.code === 0) {
                        $('#errorOut').append('This might be a CORS issue, consider installing <a href="https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi">Allow-Control-Allow-Origin</a> Chrome Extension');
                    }
                } catch (err) {
                    $('#errorOut').html('Cannot load <a href="' + data.context.url + '">' + url + '</a><br>Response body: ' + data.response.text);
                }
                break;
            case Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT:
                logError('Timeout while loading manifest');
                break;
            case Hls.ErrorDetails.MANIFEST_PARSING_ERROR:
                logError('Error while parsing manifest:' + data.reason);
                break;
            case Hls.ErrorDetails.LEVEL_EMPTY_ERROR:
                logError('Loaded level contains no fragments ' + data.level + ' ' + data.url);
                // handleLevelError demonstrates how to remove a level that errors followed by a downswitch
                // handleLevelError(data);
                break;
            case Hls.ErrorDetails.LEVEL_LOAD_ERROR:
                logError('Error while loading level playlist ' + data.context.level + ' ' + data.url);
                // handleLevelError demonstrates how to remove a level that errors followed by a downswitch
                // handleLevelError(data);
                break;
            case Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT:
                logError('Timeout while loading level playlist ' + data.context.level + ' ' + data.url);
                // handleLevelError demonstrates how to remove a level that errors followed by a downswitch
                // handleLevelError(data);
                break;
            case Hls.ErrorDetails.LEVEL_SWITCH_ERROR:
                logError('Error while trying to switch to level ' + data.level);
                break;
            case Hls.ErrorDetails.FRAG_LOAD_ERROR:
                logError('Error while loading fragment ' + data.frag.url);
                break;
            case Hls.ErrorDetails.FRAG_LOAD_TIMEOUT:
                logError('Timeout while loading fragment ' + data.frag.url);
                break;
            case Hls.ErrorDetails.FRAG_LOOP_LOADING_ERROR:
                logError('Fragment-loop loading error');
                break;
            case Hls.ErrorDetails.FRAG_DECRYPT_ERROR:
                logError('Decrypting error:' + data.reason);
                break;
            case Hls.ErrorDetails.FRAG_PARSING_ERROR:
                logError('Parsing error:' + data.reason);
                break;
            case Hls.ErrorDetails.KEY_LOAD_ERROR:
                logError('Error while loading key ' + data.frag.decryptdata.uri);
                break;
            case Hls.ErrorDetails.KEY_LOAD_TIMEOUT:
                logError('Timeout while loading key ' + data.frag.decryptdata.uri);
                break;
            case Hls.ErrorDetails.BUFFER_APPEND_ERROR:
                logError('Buffer append error');
                break;
            case Hls.ErrorDetails.BUFFER_ADD_CODEC_ERROR:
                logError('Buffer add codec error for ' + data.mimeType + ':' + data.error.message);
                break;
            case Hls.ErrorDetails.BUFFER_APPENDING_ERROR:
                logError('Buffer appending error');
                break;
            case Hls.ErrorDetails.BUFFER_STALLED_ERROR:
                logError('Buffer stalled error');
                if (stopOnStall) {
                    hls.stopLoad();
                    video.pause();
                }
                break;
        }
        if (data.fatal) {
            console.error("Fatal error : " + data.details);
            switch (data.type) {
                case Hls.ErrorTypes.MEDIA_ERROR:
                    logError("A media error occurred: " + data.details);
                    handleMediaError();
                    break;
                case Hls.ErrorTypes.NETWORK_ERROR:
                    logError("A network error occurred: " + data.details);
                    break;
                default:
                    logError("An unrecoverable error occurred: " + data.details);
                    hls.destroy();
                    break;
            }
        }
        if (!stats) {
            stats = {};
        }

        // track all errors independently
        if (stats[data.details] === undefined) {
            stats[data.details] = 1;
        } else {
            stats[data.details] += 1;
        }

        // track fatal error
        if (data.fatal) {
            if (stats.fatalError === undefined) {
                stats.fatalError = 1;
            } else {
                stats.fatalError += 1;
            }
        }
        $('#statisticsOut').text(JSON.stringify(sortObject(stats), null, '\t'));
    });
    hls.on(Hls.Events.BUFFER_CREATED, function (eventName, data) {
        tracks = data.tracks;
    });
    hls.on(Hls.Events.BUFFER_APPENDING, function (eventName, data) {
        if (dumpfMP4) {
            fmp4Data[data.type].push(data.data);
        }
    });
    hls.on(Hls.Events.FPS_DROP, function (eventName, data) {
        var event = {
            time: self.performance.now() - events.t0,
            type: 'frame drop',
            name: data.currentDropped + '/' + data.currentDecoded
        };
        events.video.push(event);
        trimEventHistory();
        if (stats) {
            if (stats.fpsDropEvent === undefined) {
                stats.fpsDropEvent = 1;
            } else {
                stats.fpsDropEvent++;
            }
            stats.fpsTotalDroppedFrames = data.totalDroppedFrames;
        }
    });
}
function handleMediaError() {
    if (autoRecoverError) {
        var now = self.performance.now();
        if (!self.recoverDecodingErrorDate || now - self.recoverDecodingErrorDate > 3000) {
            self.recoverDecodingErrorDate = self.performance.now();
            $('#statusOut').append(', trying to recover media error.');
            hls.recoverMediaError();
        } else {
            if (!self.recoverSwapAudioCodecDate || now - self.recoverSwapAudioCodecDate > 3000) {
                self.recoverSwapAudioCodecDate = self.performance.now();
                $('#statusOut').append(', trying to swap audio codec and recover media error.');
                hls.swapAudioCodec();
                hls.recoverMediaError();
            } else {
                $('#statusOut').append(', cannot recover. Last media error recovery failed.');
            }
        }
    }
}
function logStatus(message) {
    appendLog('statusOut', message);
}
function logError(message) {
    appendLog('errorOut', message);
}