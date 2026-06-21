import { Schema, model, Document } from 'mongoose';

export interface IFlashSale {
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
}

export interface IPackage extends Document {
  title: string;
  description: string;
  price: number;
  totalInventory: number;
  availableInventory: number;
  flashSale: IFlashSale;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const FlashSaleSchema = new Schema<IFlashSale>({
  isActive: {
    type: Boolean,
    default: false,
    index: true,
  },
  startTime: {
    type: Date,
    index: true,
  },
  endTime: {
    type: Date,
  },
});

const PackageSchema = new Schema<IPackage>(
  {
    title: {
      type: String,
      required: [true, 'Package title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Package description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    totalInventory: {
      type: Number,
      required: [true, 'Total inventory is required'],
      min: 0,
    },
    availableInventory: {
      type: Number,
      required: [true, 'Available inventory is required'],
      min: 0,
    },
    flashSale: {
      type: FlashSaleSchema,
      default: () => ({ isActive: false }),
    },
  },
  {
    timestamps: true,
    versionKey: 'version', // Explicitly use 'version' field for optimistic locking checks if needed
  }
);

export const Package = model<IPackage>('Package', PackageSchema);
export default Package;
