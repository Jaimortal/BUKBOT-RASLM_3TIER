import { 
  getAdminUserInfo, 
  computeKnowledgeDiff, 
  computeLocationDiff, 
  logActivity, 
  getActivityLogsList,
  deleteActivityLogEntry,
  clearActivityLogsList
} from "../server/services/activityLogService.js";
import { isMainAdminUser } from "../server/controllers/activityLogController.js";

async function runTests() {
  console.log("=== 1. Testing Admin User Info & Role Resolution ===");
  const mainAdmin = getAdminUserInfo("thepersonaljaime@gmail.com");
  console.log("Main Admin User Info:", mainAdmin);
  if (mainAdmin.role !== "main-admin") {
    throw new Error(`Expected role 'main-admin', got '${mainAdmin.role}'`);
  }

  const coAdmin = getAdminUserInfo("jhonmarkambito82@gmail.com");
  console.log("Co-Admin User Info:", coAdmin);
  if (coAdmin.role !== "co-admin") {
    throw new Error(`Expected role 'co-admin', got '${coAdmin.role}'`);
  }

  console.log("\n=== 2. Testing Main Admin Authorization Guards ===");
  const isMainAllowed = isMainAdminUser("thepersonaljaime@gmail.com");
  console.log("Is 'thepersonaljaime@gmail.com' allowed to access Active Log?", isMainAllowed);
  if (!isMainAllowed) throw new Error("Main admin should be allowed");

  const isCoAllowed = isMainAdminUser("jhonmarkambito82@gmail.com");
  console.log("Is 'jhonmarkambito82@gmail.com' allowed to access Active Log?", isCoAllowed);
  if (isCoAllowed) throw new Error("Co-admin should NOT be allowed access to Active Log");

  console.log("\n=== 3. Testing Knowledge Diff Computation ===");
  const oldTopic = {
    display_name: "Failed Academic Policy",
    responses: {
      en: ["Old English response line 1", "Old English response line 2"],
      ceb: ["Old Cebuano response line 1"]
    },
    images: ["/api/images/img1.webp"],
    pins: [{ name: "Gate 1", coordinates: [100, 200] }],
    routes: [{ name: "Route 1", points: [[0, 0], [10, 10]] }]
  };

  const newTopicUpdate = {
    displayName: "Failed Academic Policy Updated",
    responses: {
      en: ["New English response line 1", "Old English response line 2"],
      ceb: ["New Cebuano response"]
    },
    images: ["/api/images/img1.webp", "/api/images/img2.webp"],
    pins: [{ name: "Gate 1", coordinates: [100, 200] }, { name: "Gate 2", coordinates: [300, 400] }],
    routes: [{ name: "Route 1 Modified", points: [[0, 0], [20, 20]] }]
  };

  const knowledgeDiff = computeKnowledgeDiff(oldTopic, newTopicUpdate);
  console.log("Knowledge Diff Computed (" + knowledgeDiff.length + " changes):");
  knowledgeDiff.forEach(change => console.log(`  • [${change.field}] (${change.changeType}): ${change.details}`));

  console.log("\n=== 4. Testing Location Diff Computation ===");
  const oldLocation = {
    name: "Engineering Building",
    coordinates: [100, 200],
    building: "Building A",
    floor: "1st Floor",
    pins: [{ name: "Entrance", coordinates: [100, 200] }],
    imageUrls: ["/api/images/loc1.webp"]
  };

  const newLocationUpdate = {
    name: "Engineering Building",
    coordinates: [150, 250],
    building: "Building A - North Wing",
    floor: "2nd Floor",
    pins: [{ name: "Entrance", coordinates: [100, 200] }, { name: "Lab 1", coordinates: [160, 260] }],
    imageUrls: ["/api/images/loc2.webp"]
  };

  const locationDiff = computeLocationDiff(oldLocation, newLocationUpdate);
  console.log("Location Diff Computed (" + locationDiff.length + " changes):");
  locationDiff.forEach(change => console.log(`  • [${change.field}] (${change.changeType}): ${change.details}`));

  console.log("\n=== 5. Testing Activity Logging Service Insertion ===");
  const mockReq = {
    user: { username: "thepersonaljaime@gmail.com", role: "main-admin" },
    ip: "127.0.0.1",
    headers: {}
  } as any;

  const loggedItem = await logActivity(mockReq, {
    actionType: "update",
    module: "Knowledge Manager",
    summary: "Modified: Failed Academic Policy",
    targetTitle: "Failed Academic Policy",
    targetId: "Academic_policies.json",
    changes: knowledgeDiff
  });

  console.log("Logged Item Result:", {
    id: loggedItem.id,
    userEmail: loggedItem.userEmail,
    userName: loggedItem.userName,
    userRole: loggedItem.userRole,
    module: loggedItem.module,
    summary: loggedItem.summary,
    changesCount: loggedItem.changes.length
  });

  console.log("\n=== 6. Testing Query Activity Logs ===");
  const queryResult = await getActivityLogsList({ limit: 10 });
  console.log(`Retrieved ${queryResult.logs.length} logs (Total: ${queryResult.total})`);
  console.log("Latest log summary:", queryResult.logs[0]?.summary);

  console.log("\n=== ALL AUDIT TRAIL TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
