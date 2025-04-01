// types/index.ts

export interface Provider {
    id: number;
    name: string;
    eta: string;
    fare: string;
  }
  
  export interface Ride {
    id: number;
    name: string;
    pickup: string;
    destination: string;
    distance: string;
  }
  
  export interface Location {
    latitude: number;
    longitude: number;
  }
  
  export interface UserLocation {
    location: Location;
    pickup: string;
    dropoff: string;
  }