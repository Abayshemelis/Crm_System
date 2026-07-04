import React from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';

export const SettingsScreen: React.FC = () => {
  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="screen-subtitle">Manage CRM configuration.</p>
        </div>
      </div>
      <Card className="p-6 mt-6 text-center text-muted">
        Settings module coming soon...
      </Card>
    </Layout>
  );
};
