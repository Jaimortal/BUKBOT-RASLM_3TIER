import { Request, Response } from "express";
import * as dbMaps from "../db/maps";

export class MapController {
  static async getMaps(req: Request, res: Response) {
    try {
      const maps = await dbMaps.getAllMaps();
      return res.json({ success: true, data: maps });
    } catch (error) {
      console.error("Error fetching maps:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch maps" });
    }
  }

  static async getMap(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const map = await dbMaps.getMapById(parseInt(id));
      if (!map) {
        return res.status(404).json({ success: false, message: "Map not found" });
      }
      return res.json({ success: true, data: map });
    } catch (error) {
      console.error("Error fetching map:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch map" });
    }
  }

  static async getRoutes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const routes = await dbMaps.getRoutesByMapId(parseInt(id));
      return res.json({ success: true, data: routes });
    } catch (error) {
      console.error("Error fetching routes:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch routes" });
    }
  }

  static async getMarkers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const markers = await dbMaps.getMarkersByMapId(parseInt(id));
      return res.json({ success: true, data: markers });
    } catch (error) {
      console.error("Error fetching markers:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch markers" });
    }
  }

  static async upsertMap(req: Request, res: Response) {
    try {
      const mapData = req.body;
      const map = await dbMaps.upsertMap(mapData);
      return res.json({ success: true, data: map });
    } catch (error) {
      console.error("Error saving map:", error);
      return res.status(500).json({ success: false, message: "Failed to save map" });
    }
  }

  static async deleteMap(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await dbMaps.deleteMap(parseInt(id));
      return res.json({ success, message: success ? "Map deleted" : "Failed to delete map" });
    } catch (error) {
      console.error("Error deleting map:", error);
      return res.status(500).json({ success: false, message: "Failed to delete map" });
    }
  }

  static async upsertRoute(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const routeData = { ...req.body, mapId: parseInt(id) };
      const route = await dbMaps.upsertRoute(routeData);
      return res.json({ success: true, data: route });
    } catch (error) {
      console.error("Error saving route:", error);
      return res.status(500).json({ success: false, message: "Failed to save route" });
    }
  }

  static async deleteRoute(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await dbMaps.deleteRoute(parseInt(id));
      return res.json({ success, message: success ? "Route deleted" : "Failed to delete route" });
    } catch (error) {
      console.error("Error deleting route:", error);
      return res.status(500).json({ success: false, message: "Failed to delete route" });
    }
  }

  static async upsertMarker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const markerData = { ...req.body, mapId: parseInt(id) };
      const marker = await dbMaps.upsertMarker(markerData);
      return res.json({ success: true, data: marker });
    } catch (error) {
      console.error("Error saving marker:", error);
      return res.status(500).json({ success: false, message: "Failed to save marker" });
    }
  }

  static async deleteMarker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await dbMaps.deleteMarker(parseInt(id));
      return res.json({ success, message: success ? "Marker deleted" : "Failed to delete marker" });
    } catch (error) {
      console.error("Error deleting marker:", error);
      return res.status(500).json({ success: false, message: "Failed to delete marker" });
    }
  }

  static async importMap(req: Request, res: Response) {
    try {
      const { map, markers, routes: mapRoutes } = req.body;
      
      // 1. Create the map
      const newMap = await dbMaps.upsertMap(map);
      
      // 2. Create markers
      if (markers && Array.isArray(markers)) {
        for (const marker of markers) {
          await dbMaps.upsertMarker({ ...marker, mapId: newMap.id });
        }
      }
      
      // 3. Create routes
      if (mapRoutes && Array.isArray(mapRoutes)) {
        for (const route of mapRoutes) {
          await dbMaps.upsertRoute({ ...route, mapId: newMap.id });
        }
      }
      
      return res.json({ success: true, data: newMap });
    } catch (error) {
      console.error("Error importing map:", error);
      return res.status(500).json({ success: false, message: "Failed to import map" });
    }
  }
}
