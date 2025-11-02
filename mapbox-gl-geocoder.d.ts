declare module "@mapbox/mapbox-gl-geocoder" {
    import { IControl, LngLatLike, Map } from "mapbox-gl";
  
    export interface GeocoderOptions {
      accessToken?: string;
      mapboxgl?: typeof import("mapbox-gl");
      marker?: boolean | object;
      zoom?: number;
      flyTo?: boolean;
      placeholder?: string;
      bbox?: number[];
      proximity?: LngLatLike;
    }
  
    export default class MapboxGeocoder implements IControl {
      constructor(options?: GeocoderOptions);
      onAdd(map: Map): HTMLElement;
      onRemove(): void;
      getResult(): any;
      on(type: string, listener: (e: any) => void): void;
      off(type: string, listener: (e: any) => void): void;
    }
  }
  