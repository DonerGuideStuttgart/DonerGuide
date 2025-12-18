import { WaitingTime } from "./WaitingTime";

export interface StoreAnalysis {
  score: number; // 1 to 100
  meat_ratio: number; // 1 to 100
  sauce_amount: number; // 1 to 100
  size: number; // 1 to 100
  waiting_time: WaitingTime;
  image_URL: string;
  price: number;
  text: string;
}
