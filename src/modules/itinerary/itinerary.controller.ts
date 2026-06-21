import { Request, Response, NextFunction } from 'express';
import { ItineraryService } from './itinerary.service';

export class ItineraryController {
  public static async getItinerary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // Package ID parameter
      const result = await ItineraryService.getPackageItinerary(id);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
