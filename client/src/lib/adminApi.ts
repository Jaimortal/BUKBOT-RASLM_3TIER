import type { ResponseData, Location, ApiResponse, UserPrivileges, MigrationResult } from '@/types/admin';

const API_BASE = '/api/admin';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const getJsonAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };
};

// Response API functions
export async function fetchResponses(): Promise<ResponseData[]> {
  try {
    const response = await fetch(`${API_BASE}/responses`, {
      headers: getAuthHeaders(),
    });
    const result: ApiResponse = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching responses:', error);
    return [];
  }
}

export async function saveResponse(responseData: ResponseData): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/responses`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(responseData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving response:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function deleteResponseApi(intent: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/responses/${encodeURIComponent(intent)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting response:', error);
    return { success: false, message: 'Network error' };
  }
}

// Location API functions
export async function fetchLocations(): Promise<Location[]> {
  try {
    const response = await fetch(`${API_BASE}/locations`, {
      headers: getAuthHeaders(),
    });
    const result: ApiResponse = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

export async function saveLocation(locationData: Location): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/locations`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(locationData),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error('Error saving location:', result);
    }
    return result;
  } catch (error) {
    console.error('Error saving location:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function deleteLocationApi(id: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/locations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting location:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function fetchUserPrivilegesAdmin(): Promise<UserPrivileges> {
  try {
    const response = await fetch(`${API_BASE}/privileges`, {
      headers: getAuthHeaders(),
    });
    const result: ApiResponse = await response.json();
    return result.success
      ? (result.data as UserPrivileges)
      : { chatEnabled: true, audioInputEnabled: true, mapAccessEnabled: true, autoTranslateEnabled: true };
  } catch (error) {
    console.error('Error fetching privileges:', error);
    return { chatEnabled: true, audioInputEnabled: true, mapAccessEnabled: true, autoTranslateEnabled: true };
  }
}

export async function saveUserPrivilegesAdmin(privileges: UserPrivileges): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/privileges`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(privileges),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving privileges:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function fetchAutoTranslateStatus(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/auto-translate-status`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching auto-translate status:', error);
    return { success: false, message: 'Network error' };
  }
}

// Map Settings API functions
export interface MapData {
  id: string;
  url: string;
  active: boolean;
  name?: string;
}

export interface MapSettings {
  maps: MapData[];
}

export async function fetchMapSettings(): Promise<MapSettings> {
  try {
    const response = await fetch(`/api/map-settings`, {
      headers: getAuthHeaders(),
    });
    const result: ApiResponse = await response.json();
    return result.success ? result.data : { maps: [] };
  } catch (error) {
    console.error('Error fetching map settings:', error);
    return { maps: [] };
  }
}

export async function saveMapSettings(settings: MapSettings): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/map-settings`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving map settings:', error);
    return { success: false, message: 'Network error' };
  }
}

export interface ChatbotReportGroup {
  ipHash: string;
  ipAddress: string;
  count: number;
  latestAt: string;
  reports: Array<{
    id: string;
    email: string;
    report: string;
    reportKind?: string;
    question?: string;
    botResponse?: string;
    userAgent?: string;
    createdAt: string;
  }>;
}

export async function submitChatbotReport(payload: { email: string; report: string }): Promise<ApiResponse & { remainingDays?: number; limited?: boolean }> {
  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error('Error submitting chatbot report:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function submitChatbotResponseReport(payload: {
  email: string;
  report: string;
  question: string;
  botResponse: string;
}): Promise<ApiResponse & { remainingDays?: number; limited?: boolean }> {
  try {
    const response = await fetch('/api/reports/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error('Error submitting chatbot response report:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function fetchChatbotReports(): Promise<ChatbotReportGroup[]> {
  try {
    const response = await fetch(`${API_BASE}/reports`, {
      headers: getAuthHeaders(),
    });
    const result: ApiResponse = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching chatbot reports:', error);
    return [];
  }
}

export async function deleteChatbotReport(reportId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting chatbot report:', error);
    return { success: false, message: 'Network error' };
  }
}

export interface ChatWidgetSettings {
  inactiveIcon: string;
  inactiveImageUrl: string;
  activeIcon: string;
  activeImageUrl: string;
  inactiveCustomImages: string[];
  activeCustomImages: string[];
  chatheadBgColor: string;
  chatheadOpacity: number;
  audioResponseEnabled: boolean;
}

const DEFAULT_CHAT_WIDGET_SETTINGS: ChatWidgetSettings = {
  inactiveIcon: '💬',
  inactiveImageUrl: '',
  activeIcon: '✕',
  activeImageUrl: '',
  inactiveCustomImages: [],
  activeCustomImages: [],
  chatheadBgColor: '#001C38',
  chatheadOpacity: 1,
  audioResponseEnabled: true,
};

export async function fetchChatWidgetSettings(): Promise<ChatWidgetSettings> {
  try {
    const response = await fetch('/api/chat-widget-settings');
    const result: ApiResponse = await response.json();
    return result.success ? { ...DEFAULT_CHAT_WIDGET_SETTINGS, ...result.data } : DEFAULT_CHAT_WIDGET_SETTINGS;
  } catch (error) {
    console.error('Error fetching chat widget settings:', error);
    return DEFAULT_CHAT_WIDGET_SETTINGS;
  }
}

export async function saveChatWidgetSettings(settings: ChatWidgetSettings): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/chat-widget-settings`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving chat widget settings:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function deleteUploadedImageByUrl(url: string): Promise<ApiResponse> {
  const match = url.match(/^\/api\/images\/([^/?#]+)/);
  if (!match) return { success: true, message: 'External image URL removed from settings.' };

  try {
    const response = await fetch(`${API_BASE}/images/${encodeURIComponent(match[1])}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting uploaded image:', error);
    return { success: false, message: 'Failed to delete uploaded image' };
  }
}

export interface NormalizationRules {
  phrases: Record<string, string>;
  tokens: Record<string, string>;
  roots: Record<string, string>;
  fuzzy_roots: Record<string, string>;
}

export const EMPTY_NORMALIZATION_RULES: NormalizationRules = {
  phrases: {},
  tokens: {},
  roots: {},
  fuzzy_roots: {},
};

export async function fetchNormalizationRules(): Promise<NormalizationRules> {
  try {
    const response = await fetch(`${API_BASE}/normalization-rules`, {
      headers: getAuthHeaders(),
    });
    const result: ApiResponse = await response.json();
    return result.success ? { ...EMPTY_NORMALIZATION_RULES, ...result.data } : EMPTY_NORMALIZATION_RULES;
  } catch (error) {
    console.error('Error fetching normalization rules:', error);
    return EMPTY_NORMALIZATION_RULES;
  }
}

export async function saveNormalizationRules(rules: NormalizationRules): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/normalization-rules`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(rules),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving normalization rules:', error);
    return { success: false, message: 'Network error' };
  }
}

// Email verification API functions
export async function sendVerificationCode(email: string): Promise<ApiResponse> {
  try {
    const response = await fetch('/api/email/send-verification', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending verification code:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function verifyCodeAndUpdateEmail(
  newEmail: string,
  verificationCode: string,
  currentEmail: string,
  password: string
): Promise<ApiResponse> {
  try {
    const response = await fetch('/api/email/verify-and-update', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        newEmail,
        verificationCode,
        currentEmail,
        password,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error verifying code and updating email:', error);
    return { success: false, message: 'Network error' };
  }
}

// Password change API function
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Password change failed:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Network error' };
  }
}

// FAQ API functions
export async function fetchAllFaqs(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/faqs`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }
}

export async function fetchActiveFaqs(): Promise<any[]> {
  try {
    const response = await fetch(`/api/faqs`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching active FAQs:', error);
    return [];
  }
}

export async function saveFaq(faqData: any): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/faqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(faqData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving FAQ:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function deleteFaqApi(id: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/faqs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    return { success: false, message: 'Network error' };
  }
}

// Bot Topics API
export interface BotTopic {
  topicKey: string;
  payload: string;
  superIntent: string;
  defaultLabel: string;
  defaultIcon: string;
  routingType: string;
  previewResponse?: string;
}

export interface BotCategory {
  id: string; 
  displayName: string;
  sourceFile: string;
  topics: BotTopic[];
}

export async function fetchBotTopics(): Promise<BotCategory[]> {
  try {
    const response = await fetch(`${API_BASE}/bot-topics`, {
      headers: getAuthHeaders(),
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.categories || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching bot topics:', error);
    return [];
  }
}

// ─── Super Intents API ────────────────────────────────────────────────────────

// Knowledge Manager API
export interface KnowledgeRecord {
  id: string;
  file: string;
  path: number[];
  parentTopic: string | null;
  parentSubjectKey: string | null;
  topic: string;
  intent: string | null;
  contextTopic: string | null;
  displayName: string;
  subjectKey: string | null;
  subjectType: string | null;
  subjectTerms: string[];
  responses: { en: string[]; ceb: string[] };
  phrases: string[];
  images: string[];
  map: any;
  mapData: any;
  pins: any[];
  routes: any[];
  mapRef: string;
  items: KnowledgeChildItem[];
  itemGroups: Record<string, any>;
  itemDisclaimer: string;
  hasResponses: boolean;
  hasMap: boolean;
  hasMapRef: boolean;
  subtopicCount: number;
}

export interface KnowledgeChildItem {
  key?: string;
  group?: string;
  name?: string;
  value?: string;
  text?: string;
  aliases?: string[];
}

export interface KnowledgeListResult {
  records: KnowledgeRecord[];
  files: { file: string; count: number }[];
}

export async function fetchKnowledgeRecords(): Promise<KnowledgeListResult> {
  try {
    const response = await fetch(`${API_BASE}/knowledge`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    return result.success ? { records: result.records || [], files: result.files || [] } : { records: [], files: [] };
  } catch (error) {
    console.error('Error fetching knowledge records:', error);
    return { records: [], files: [] };
  }
}

export async function updateKnowledgeRecord(
  file: string,
  recordData: Partial<KnowledgeRecord> & { path: number[]; topic: string }
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/knowledge/${encodeURIComponent(file)}/topic`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(recordData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating knowledge record:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function createKnowledgeParent(
  file: string,
  parentData: {
    topic: string;
    displayName?: string;
    subjectKey: string;
    subjectType?: string;
    subjectTerms?: string[];
  }
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/knowledge/${encodeURIComponent(file)}/parent`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(parentData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating parent subject:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function createKnowledgeSubtopic(
  file: string,
  subtopicData: {
    parentPath: number[];
    topic: string;
    displayName?: string;
    intent?: string;
    contextTopic?: string;
    responses: { en: string[]; ceb: string[] };
    phrases?: string[];
    images?: string[];
    mapRef?: string;
    map?: any;
    mapData?: any;
    pins?: any[];
    routes?: any[];
  }
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/knowledge/${encodeURIComponent(file)}/subtopic`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(subtopicData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating subtopic:', error);
    return { success: false, message: 'Network error' };
  }
}

export interface SuperIntentMeta {
  file: string;
  intent: string;
  displayName: string;
  topicCount: number;
}

export interface TopicPin {
  name: string;
  lat: number;
  lng: number;
  floor?: string;
  access?: string;
  pinType?: string;
}

export interface TopicRoute {
  name: string;
  points: [number, number][];
  color?: string;
  route_order?: number;
  route_label?: string;
}

export interface TopicData {
  topic: string;
  ui_name: string | null;
  displayName: string;
  responses: { en: string[]; ceb: string[] };
  images: string[];
  map: { lat: number; lng: number } | null;
  pins: TopicPin[];
  routes?: TopicRoute[];
}

export interface SuperIntentTopicsResult {
  intent: string;
  displayName: string;
  topics: TopicData[];
}

export async function fetchSuperIntents(): Promise<SuperIntentMeta[]> {
  try {
    const response = await fetch(`${API_BASE}/super-intents`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    return result.success ? result.superIntents : [];
  } catch (error) {
    console.error('Error fetching super intents:', error);
    return [];
  }
}

export async function fetchSuperIntentTopics(file: string): Promise<SuperIntentTopicsResult | null> {
  try {
    const response = await fetch(`${API_BASE}/super-intents/${encodeURIComponent(file)}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    return result.success ? result : null;
  } catch (error) {
    console.error('Error fetching super intent topics:', error);
    return null;
  }
}

export async function updateSuperIntentTopic(
  file: string,
  topicData: {
    topic: string;
    ui_name?: string;
    responses?: { en: string[]; ceb: string[] };
    images?: string[];
    map?: { lat: number; lng: number } | null;
    pins?: TopicPin[];
    routes?: TopicRoute[];
  }
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/super-intents/${encodeURIComponent(file)}/topic`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(topicData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating topic:', error);
    return { success: false, message: 'Network error' };
  }
}

// ─── Migration API ────────────────────────────────────────────────────────────

export async function fetchMigrationStatus(): Promise<ApiResponse & { data?: any }> {
  try {
    const response = await fetch(`${API_BASE}/migrate/status`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching migration status:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function migrateResponses(): Promise<MigrationResult> {
  try {
    const response = await fetch(`${API_BASE}/migrate/responses`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error migrating responses:', error);
    return { success: false, message: 'Network error', imported: 0, errors: [] };
  }
}

export async function migrateLocations(): Promise<MigrationResult> {
  try {
    const response = await fetch(`${API_BASE}/migrate/locations`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error migrating locations:', error);
    return { success: false, message: 'Network error', imported: 0, errors: [] };
  }
}

export async function migrateSuperIntents(): Promise<MigrationResult> {
  try {
    const response = await fetch(`${API_BASE}/migrate/super-intents`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error migrating super intents:', error);
    return { success: false, message: 'Network error', imported: 0, errors: [] };
  }
}
export async function syncKnowledgeBaseApi(force: boolean = false): Promise<MigrationResult> {
  try {
    const response = await fetch(`${API_BASE}/migrate/sync?force=${force}`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error syncing knowledge base:', error);
    return { success: false, message: 'Network error', imported: 0, errors: [] };
  }
}

// ─── New Map API ─────────────────────────────────────────────────────────────

export interface MapInfo {
  id?: number;
  name: string;
  styleUrl?: string;
  zoom?: number;
  center?: number[];
  isDefault?: boolean;
}

export interface RouteInfo {
  id?: number;
  mapId: number;
  name: string;
  points: { lat: number; lng: number }[];
  color?: string;
  weight?: number;
}

export interface MarkerInfo {
  id?: number;
  mapId: number;
  name: string;
  lat: string;
  lng: string;
  description?: string;
  type?: string;
}

export async function fetchAllMaps(): Promise<MapInfo[]> {
  try {
    const response = await fetch('/api/maps');
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching all maps:', error);
    return [];
  }
}

export async function fetchMap(id: number): Promise<MapInfo | null> {
  try {
    const response = await fetch(`/api/maps/${id}`);
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching map:', error);
    return null;
  }
}

export async function fetchMapRoutes(id: number): Promise<RouteInfo[]> {
  try {
    const response = await fetch(`/api/maps/${id}/routes`);
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching map routes:', error);
    return [];
  }
}

export async function fetchMapMarkers(id: number): Promise<MarkerInfo[]> {
  try {
    const response = await fetch(`/api/maps/${id}/markers`);
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching map markers:', error);
    return [];
  }
}

export async function saveMap(mapData: MapInfo): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/maps`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(mapData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving map:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function deleteMap(id: number): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/maps/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting map:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function saveRoute(mapId: number, routeData: RouteInfo): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/maps/${mapId}/routes`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(routeData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving route:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function deleteRoute(id: number): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/routes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting route:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function saveMarker(mapId: number, markerData: MarkerInfo): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/maps/${mapId}/markers`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(markerData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving marker:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function deleteMarker(id: number): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/markers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting marker:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function importMap(mapData: { map: MapInfo, markers: MarkerInfo[], routes: RouteInfo[] }): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/maps/import`, {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(mapData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error importing map:', error);
    return { success: false, message: 'Network error' };
  }
}
