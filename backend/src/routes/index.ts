
import express from 'express';
import userRoutes from './user';
import healthRoutes from './health';


const router = express.Router();

router.use('/users', userRoutes);
router.use('/health', healthRoutes);

export default router;