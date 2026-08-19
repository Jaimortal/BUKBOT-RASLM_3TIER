export interface Intent {
  id: string;
  name: string;
  keywords: string[];
  response: string;
  category: string;
  type: 'text' | 'map';
  linkedLocationId?: string;
}

export interface Location {
  id: string;
  name: string;
  coordinates?: [number, number] | []; // [y, x] format
  mapImage: string;
  type?: string;
  building?: string;
  floor?: string;
  pins?: Array<{
    name: string;
    coordinates: [number, number];
    floor?: string;
    access?: string;
    pinType?: string;
  }>;
  routes?: Array<{
    name: string;
    points: [number, number][];
    color?: string;
    route_order?: number;
    route_label?: string;
  }>;
  responses?: {
    en?: string[];
    ceb?: string[];
  };
  imageUrls?: string[];
}

export interface ResponseData {
  intent: string;
  category: string;
  sub_category: string;
  responses: {
    answer: string[] | Record<string, string[]>;
    imageUrl?: string;
    imageUrls?: string[];
    mapData?: {
      locationName: string;
      coordinates?: [number, number];
      pins?: Array<{ name: string; coordinates: [number, number]; floor?: string; access?: string; pinType?: string }>;
      routes?: Array<{ name: string; points: [number, number][]; color?: string; route_order?: number; route_label?: string }>;
      mapId: string;
    } | Array<{
      locationName: string;
      coordinates?: [number, number];
      pins?: Array<{ name: string; coordinates: [number, number]; floor?: string; access?: string; pinType?: string }>;
      routes?: Array<{ name: string; points: [number, number][]; color?: string; route_order?: number; route_label?: string }>;
      mapId: string;
    }>;
    follow_up?: string[];
    context_slots?: Record<string, any>;
  };
  laboratories?: Record<
    string,
    {
      en?: string[];
      ceb?: string[];
      image?: string;
      images?: string[];
      coordinates?: [number, number] | number[];
      map_id?: string;
      mapId?: string;
    }
  >;
  metadata: {
    source: string;
    author?: string;
  };
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export interface UserPrivileges {
  chatEnabled: boolean;
  audioInputEnabled: boolean;
  mapAccessEnabled: boolean;
  autoTranslateEnabled: boolean;
}

export interface FaqConfig {
  id?: string;
  superIntent: string;
  topicKey: string;
  displayLabel: string;
  subtitle?: string | null;
  icon?: string | null;
  payload: string;
  enabled: boolean;
  sortOrder: number;
}
export interface MigrationResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
}
