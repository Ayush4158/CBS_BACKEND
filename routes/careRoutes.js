import express from 'express';
import { 
    getPendingClients, 
    activateClientAccount 
} from '../controllers/adminController.js';
import { 
    getMyAssignedRoster, 
    createBucketTask, 
    toggleTaskItemComplete, 
    getFamilyDashboardFeed, 
    verifyLoggedAction, 
    addItemsToBucket,
    getMyClients,
    getSharedBuckets
} from '../controllers/careFulfillmentController.js';
import { 
    requestCallback 
} from '../controllers/careController.js';
import { 
    authenticateToken, 
    restrictTo, 
    validate 
} from '../middlewares/authMiddleware.js'; 
import { 
    callbackSchema,
    activateClientSchema,      // UPDATED: Imported validation schema
    createBucketTaskSchema     // UPDATED: Imported validation schema
} from '../validators/formSchemas.js'; 

const router = express.Router();

// --- PUBLIC LEAD INTAKE ---
router.post('/callback', validate(callbackSchema), requestCallback);

// --- STAFF ADMIN OPERATIONS ---
router.get('/admin/pending-clients', authenticateToken, restrictTo('admin'), getPendingClients);

// UPDATED: Wrapped with activateClientSchema validation middleware
router.put('/admin/activate-client', 
    authenticateToken, 
    restrictTo('admin'), 
    validate(activateClientSchema), 
    activateClientAccount
);

// --- COMPANION SERVICE ACTIONS ---
router.get('/companion/roster', authenticateToken, restrictTo('companion'), getMyAssignedRoster);

// UPDATED: Wrapped with createBucketTaskSchema validation middleware
router.post('/companion/tasks/bucket', 
    authenticateToken, 
    restrictTo('companion'), 
    validate(createBucketTaskSchema), 
    createBucketTask
);

router.put('/companion/toggle-item/:itemId', authenticateToken, restrictTo('companion'), toggleTaskItemComplete);

// --- FAMILY TRANSPARENCY ACTIONS ---
router.get('/family/feed', authenticateToken, restrictTo('user'), getFamilyDashboardFeed);
router.put('/family/verify-task/:taskId', authenticateToken, restrictTo('user'), verifyLoggedAction);

// --- SHARED DATA (Companion & Family) ---
// Both can see the full list of buckets and tasks for a specific client
router.get('/shared/buckets/:clientId', authenticateToken, getSharedBuckets);

// --- COMPANION ACTIONS ---
// Add a task item to an existing bucket
router.post('/companion/tasks/:bucketId/items', authenticateToken, restrictTo('companion'), addItemsToBucket);

// Get my assigned clients
router.get('/companion/my-clients', authenticateToken, restrictTo('companion'), getMyClients);

export default router;