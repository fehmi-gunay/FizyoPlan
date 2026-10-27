import { Request, Response } from 'express';
import { BodyRegion } from '../models';

export async function listRegions(_req: Request, res: Response) {
  const regions = await BodyRegion.findAll({ order: [['id', 'ASC']] });
  res.json({ regions });
}
