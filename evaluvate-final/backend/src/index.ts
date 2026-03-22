/**
 * Evaluvate AI — Function Registration Barrel
 *
 * Azure Functions v4 (Node.js) discovers functions by importing this
 * entry point. Every function file must be imported here.
 *
 * When you add a new function:
 *   1. Create the file in src/functions/
 *   2. Add an import line below
 *   3. The function is registered automatically via app.http() in each file
 */

// Core pipeline
import "./functions/health.js";
import "./functions/uploadSasToken.js";
import "./functions/registerUpload.js";
import "./functions/triggerScoring.js";

// Grading workflow
import "./functions/gradingFunctions.js";

// Future functions (uncomment as you build them):
// import "./functions/getExams.js";
// import "./functions/createExam.js";
// import "./functions/getAuditLog.js";
// import "./functions/getUsageStats.js";
