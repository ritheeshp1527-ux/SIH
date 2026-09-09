import { Router } from 'express';
import { VoyageController } from '../controllers/voyage.controller';

const router = Router();
const voyageController = new VoyageController();

router.post('/voyage', voyageController.getVoyage);

export default router;
