import React from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';

export const UsersScreen: React.FC = () => {
  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">User Management</h1>
          <p className="screen-subtitle">Manage CRM users and roles.</p>
        </div>
      </div>
      <Card className="p-6 mt-6 text-center text-muted">
        User management module coming soon...
      </Card>
    </Layout>
  );
};
