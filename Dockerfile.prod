FROM python:3.8-bullseye

ENV HOME=/home/hplivestreaming
ENV APP_HOME=${HOME}/web

RUN mkdir -p ${APP_HOME}
WORKDIR ${APP_HOME}

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client libpq-dev gcc python3-dev musl-dev \
        libjpeg-dev zlib1g-dev libmagic-dev libffi-dev

RUN pip install --upgrade pip
COPY ./requirements.txt .
RUN pip install -r requirements.txt

COPY . ${APP_HOME}