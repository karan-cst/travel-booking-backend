import { Request, Response, NextFunction } from 'express';
import { Package } from './package.model';
import { redisClient } from '../../config/redis';
import { NotFoundError } from '../../utils/customErrors';
import { logger } from '../../config/logger';

export class PackagesController {
  public static async createPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description, price, totalInventory, flashSale } = req.body;

      const newPackage = new Package({
        title,
        description,
        price,
        totalInventory,
        availableInventory: totalInventory,
        flashSale,
      });

      await newPackage.save();

      res.status(201).json({
        status: 'success',
        data: newPackage,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const packages = await Package.find();
      res.status(200).json({
        status: 'success',
        results: packages.length,
        data: packages,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async configureFlashSale(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive, startTime, endTime, allotmentCount } = req.body;

      const pkg = await Package.findById(id);
      if (!pkg) {
        throw new NotFoundError('Package not found');
      }

      pkg.flashSale = {
        isActive,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      };

      if (allotmentCount !== undefined) {
        pkg.availableInventory = allotmentCount;
      }

      await pkg.save();

      // If flash sale is active, instantly push available allotments to Redis
      if (isActive) {
        const redisKey = `inventory:${pkg._id}`;
        await redisClient.set(redisKey, pkg.availableInventory.toString());
        logger.info(`🔥 Flash sale activated! Pushed ${pkg.availableInventory} slots to Redis key: ${redisKey}`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Flash sale configuration updated successfully.',
        data: pkg,
      });
    } catch (error) {
      next(error);
    }
  }
}
