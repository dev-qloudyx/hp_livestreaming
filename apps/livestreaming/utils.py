
import requests


class Drone_Helper():
    
    def get_and_set_status(self, url, drone):

        endpoint_url = f'{url}{drone.key}/llhls.m3u8'
            
        request = requests.get(endpoint_url)

        if request.status_code == 200 or request.status_code == 201:
            drone.status = True
        else:
            drone.status = False
        
        drone.save()

        return drone
    