import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VitalsChartProps {
  data: any[];
  dataKey: string;
  color: string;
  name: string;
  unit: string;
}

export default function VitalsChart({ data, dataKey, color, name, unit }: VitalsChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#E1E5D5" />
          <XAxis 
            dataKey="timestamp" 
            hide 
          />
          <YAxis 
            domain={['auto', 'auto']} 
            stroke="#8A958A" 
            fontSize={10} 
            tickFormatter={(value) => `${value}`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '24px', 
              border: '1px solid #E1E5D5', 
              boxShadow: '0 4px 12px -1px rgb(0 0 0 / 0.05)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '12px 16px'
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ display: 'none' }}
          />
          <Legend 
             iconType="circle" 
             wrapperStyle={{ 
               fontSize: '10px', 
               paddingTop: '20px', 
               textTransform: 'uppercase', 
               letterSpacing: '0.1em',
               fontWeight: 'bold',
               color: '#8A958A'
             }} 
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            name={name}
            strokeWidth={3} 
            dot={false}
            animationDuration={600}
            strokeLinecap="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
