"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getPriceHistory } from "@/app/actions";
import { Loader2 } from "lucide-react";

interface PriceHistoryItem {
  checked_at: string;
  price: number;
}

interface ChartPoint {
  date: string;
  price: number;
}

interface PriceChartProps {
  productId: string;
}

export default function PriceChart({ productId }: PriceChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);

      const history: PriceHistoryItem[] = await getPriceHistory(productId);

      if (!isMounted) return;

      const chartData: ChartPoint[] = history.map((item) => ({
        date: new Date(item.checked_at).toLocaleDateString(),
        price: Number(item.price),
      }));

      setData(chartData);
      setLoading(false);
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 w-full">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading chart...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 w-full">
        No price history yet. Check back after the first daily update!
      </div>
    );
  }

  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold mb-4 text-gray-700">
        Price History
      </h4>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#FA5D19"
            strokeWidth={2}
            dot={{ fill: "#FA5D19", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
