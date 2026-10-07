import React from 'react';
import { Typography } from 'antd';
import { COLORS } from '../constants/theme';

const { Title } = Typography;

export default function PageHeader({ title, style }) {
  return (
    <Title 
      level={3} 
      style={{ 
        color: COLORS.MIDNIGHT_BLUE, 
        fontFamily: '"Source Serif 4", serif', 
        marginBottom: 24,
        ...style
      }}
    >
      {title}
    </Title>
  );
}