import React, { useState } from 'react';
import Workspace from './components/Workspace';
import AuthOTP from './components/AuthOTP';
import CommandPalette from './components/CommandPalette';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="min-h-screen bg-white selection:bg-navy-950 selection:text-white">
      {!isAuthenticated ? (
        <AuthOTP onVerify={() => setIsAuthenticated(true)} />
      ) : (
        <>
          <Workspace />
          <CommandPalette />
        </>
      )}
    </div>
  );
}

