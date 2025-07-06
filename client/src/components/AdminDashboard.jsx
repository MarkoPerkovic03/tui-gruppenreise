import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Alert
} from '@mui/material';
import api from '../services/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
      setError('Fehler beim Laden der Benutzer');
    }
  };

  const handleRoleChange = async (userId, isSystemAdmin) => {
    try {
      await api.put(`/users/${userId}`, { isSystemAdmin });
      setUsers(users.map(user =>
        user.id === userId ? { ...user, isSystemAdmin } : user
      ));
    } catch (error) {
      console.error('Fehler beim Ändern der Benutzerrolle:', error);
      setError('Fehler beim Ändern der Benutzerrolle');
    }
  };

  return (
    <>
      <Box className="page-header">
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Systemadministration
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Verwalten Sie Benutzer und deren Rollen
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ width: '100%', mb: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>E-Mail</TableCell>
                  <TableCell>Systemadministrator</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isSystemAdmin}
                        onChange={(e) => handleRoleChange(user.id, e.target.checked)}
                        inputProps={{ 'aria-label': 'Systemadministrator-Status' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </>
  );
};

export default AdminDashboard; 
