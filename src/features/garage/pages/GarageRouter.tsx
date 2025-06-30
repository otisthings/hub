import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { GarageDashboard } from '../components/GarageDashboard';
import { ContributorTiers } from '../components/ContributorTiers';
import { RedeemCode } from '../components/RedeemCode';

export const GarageRouter: React.FC = () => {
  return (
    <Routes>
      <Route index element={<GarageDashboard />} />
      <Route path="tiers" element={<ContributorTiers />} />
      <Route path="redeem" element={<RedeemCode />} />
    </Routes>
  );
};