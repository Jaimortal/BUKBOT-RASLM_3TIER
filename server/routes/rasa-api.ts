/**
 * API routes for Rasa to fetch responses from PostgreSQL
 * These endpoints replace direct JSON file access for production
 */

import { Router } from "express";
import * as dbResponses from "../db/responses.js";
import * as dbLocations from "../db/locations.js";
import * as dbSuperIntents from "../db/superIntents.js";

const router = Router();

/**
 * GET /api/rasa/responses/:intent
 * Get a specific response by intent
 */
router.get("/responses/:intent", async (req, res) => {
  try {
    const { intent } = req.params;
    const response = await dbResponses.getResponseByIntent(intent);
    
    if (!response) {
      return res.status(404).json({
        success: false,
        message: `Response not found for intent: ${intent}`
      });
    }

    // Transform to Rasa-friendly format
    const result = {
      intent: response.intent,
      category: response.category,
      sub_category: response.subCategory,
      responses: {
        answer: response.answerEn?.length 
          ? { en: response.answerEn, ceb: response.answerCeb || [] }
          : response.answer || [],
        follow_up: response.followUp || [],
        context_slots: response.contextSlots || {},
        imageUrl: response.imageUrl || undefined,
        imageUrls: response.imageUrls || undefined,
        mapData: response.mapData || undefined,
      },
      metadata: response.metadata || {},
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching response:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching response"
    });
  }
});

/**
 * GET /api/rasa/responses
 * Get all responses (for caching in Rasa)
 */
router.get("/responses", async (_req, res) => {
  try {
    const responses = await dbResponses.getAllResponses();
    
    const results = responses.map(response => ({
      intent: response.intent,
      category: response.category,
      sub_category: response.subCategory,
      responses: {
        answer: response.answerEn?.length 
          ? { en: response.answerEn, ceb: response.answerCeb || [] }
          : response.answer || [],
        follow_up: response.followUp || [],
        context_slots: response.contextSlots || {},
        imageUrl: response.imageUrl || undefined,
        imageUrls: response.imageUrls || undefined,
        mapData: response.mapData || undefined,
      },
      metadata: response.metadata || {},
    }));

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error("Error fetching all responses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching responses"
    });
  }
});

/**
 * POST /api/rasa/responses/search
 * Search responses by query
 */
router.post("/responses/search", async (req, res) => {
  try {
    const { query } = req.body;
    const responses = await dbResponses.searchResponses(query);
    
    res.json({
      success: true,
      count: responses.length,
      data: responses
    });
  } catch (error) {
    console.error("Error searching responses:", error);
    res.status(500).json({
      success: false,
      message: "Error searching responses"
    });
  }
});

/**
 * GET /api/rasa/locations/:name
 * Get a specific location by name
 */
router.get("/locations/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const location = await dbLocations.getLocationByName(name);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location not found: ${name}`
      });
    }

    // Transform to Rasa-friendly format
    const result = {
      name: location.name,
      type: location.type,
      building: location.building,
      floor: location.floor,
      coordinates: location.coordinates,
      map_id: location.mapId,
      responses: {
        en: location.responsesEn || [],
        ceb: location.responsesCeb || [],
      },
      pins: location.pins || [],
      routes: location.routes || [],
      imageUrls: location.imageUrls || [],
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching location:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching location"
    });
  }
});

/**
 * GET /api/rasa/locations
 * Get all locations
 */
router.get("/locations", async (_req, res) => {
  try {
    const locations = await dbLocations.getAllLocations();
    
    const results = locations.map((location: any) => ({
      name: location.name,
      type: location.type,
      building: location.building,
      floor: location.floor,
      coordinates: location.coordinates,
      map_id: location.mapId,
      responses: {
        en: location.responsesEn || [],
        ceb: location.responsesCeb || [],
      },
      pins: location.pins || [],
      routes: location.routes || [],
      imageUrls: location.imageUrls || [],
    }));

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error("Error fetching all locations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching locations"
    });
  }
});

/**
 * GET /api/rasa/locations/type/:type
 * Get locations by type
 */
router.get("/locations/type/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const locations = await dbLocations.getLocationsByType(type);
    
    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error("Error fetching locations by type:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching locations"
    });
  }
});

/**
 * GET /api/rasa/super-intents/:superIntent
 * Get all topics for a super intent
 */
router.get("/super-intents/:superIntent", async (req, res) => {
  try {
    const { superIntent } = req.params;
    const topics = await dbSuperIntents.getSuperIntentByName(superIntent);
    
    const results = topics.map((topic: any) => ({
      super_intent: topic.superIntent,
      topic: topic.topic,
      ui_name: topic.uiName,
      responses: {
        en: topic.responsesEn || [],
        ceb: topic.responsesCeb || [],
      },
      imageUrls: topic.imageUrls || [],
      mapData: topic.mapData,
      pins: topic.pins || [],
      routes: topic.routes || [],
    }));

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error("Error fetching super intent topics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching super intent topics"
    });
  }
});

/**
 * GET /api/rasa/super-intents/:superIntent/:topic
 * Get a specific topic from a super intent
 */
router.get("/super-intents/:superIntent/:topic", async (req, res) => {
  try {
    const { superIntent, topic } = req.params;
    const response = await dbSuperIntents.getSuperIntentTopic(superIntent, topic);
    
    if (!response) {
      return res.status(404).json({
        success: false,
        message: `Topic not found: ${topic} in ${superIntent}`
      });
    }

    const result = {
      super_intent: response.superIntent,
      topic: response.topic,
      ui_name: response.uiName,
      responses: {
        en: response.responsesEn || [],
        ceb: response.responsesCeb || [],
      },
      imageUrls: response.imageUrls || [],
      mapData: response.mapData,
      pins: response.pins || [],
      routes: response.routes || [],
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching super intent topic:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching super intent topic"
    });
  }
});

/**
 * GET /api/rasa/health
 * Health check endpoint
 */
router.get("/health", async (_req, res) => {
  try {
    // Test database connection
    const responses = await dbResponses.getAllResponses();
    const locations = await dbLocations.getAllLocations();
    const superIntents = await dbSuperIntents.getAllSuperIntents();
    
    res.json({
      success: true,
      status: "healthy",
      data: {
        responses_count: responses.length,
        locations_count: locations.length,
        super_intents_count: superIntents.length,
      }
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      message: "Database connection error"
    });
  }
});

export default router;
