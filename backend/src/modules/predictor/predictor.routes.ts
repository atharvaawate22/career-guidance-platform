import { Router } from 'express';
import { PredictorController } from './predictor.controller';

const router = Router();
const predictorController = new PredictorController();

router.get('/', (_req, res) => {
  res.json({
    endpoint: '/api/predict',
    method: 'POST',
    description:
      'Predict college admission chances based on percentile and preferences',
    requiredFields: {
      percentile: 'number',
      category: 'string (Open, OBC, SC, ST, etc.)',
      branchPreference: 'string',
      homeUniversity: 'string (Mumbai, Pune, Aurangabad, etc.)',
      gender: 'string (optional: Male or Female candidate)',
      minority_type: 'string (optional: linguistic or religious)',
      minority_group: 'string (optional: hindi, muslim, jain, etc.)',
    },
  });
});

router.post('/', predictorController.predict.bind(predictorController));

export default router;
