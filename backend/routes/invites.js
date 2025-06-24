// === ECHTE LÖSUNG - INVITE SYSTEM MIT DATENBANK ===

// SCHRITT 1: Kopiere diese Datei nach backend/routes/invites.js

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Group = require('../models/Group');
const User = require('../models/user');
const auth = require('../middleware/auth');

// Debug logging für alle invite requests
router.use((req, res, next) => {
  console.log(`📡 INVITE: ${req.method} ${req.originalUrl}`, {
    params: req.params,
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'none',
      origin: req.headers.origin
    }
  });
  next();
});

// @route   POST /api/invites/generate
// @desc    Generate invite link for a group
// @access  Private (Admin only)
router.post('/generate', auth, async (req, res) => {
  try {
    const { groupId, expiresInDays = 7 } = req.body;
    
    console.log('🔗 Generate invite link for group:', groupId, 'User:', req.user.id);
    
    // Load group and check admin permission
    const group = await Group.findById(groupId);
    if (!group) {
      console.log('❌ Group not found:', groupId);
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Check if user is admin of the group
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      console.log('❌ User not admin:', req.user.id, 'Member:', userMember);
      return res.status(403).json({ 
        message: 'Nur Gruppen-Admins können Einladungslinks generieren' 
      });
    }
    
    // Generate unique token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiry time
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Save token in group using the method from Group model
    if (group.generateInviteToken) {
      // Use model method if available
      group.generateInviteToken(expiresInDays);
    } else {
      // Manual assignment
      group.inviteToken = inviteToken;
      group.inviteTokenExpires = expiresAt;
    }
    
    await group.save();
    
    console.log('✅ Invite link generated:', { 
      token: inviteToken, 
      expires: expiresAt,
      groupName: group.name 
    });
    
    res.json({
      success: true,
      inviteToken: group.inviteToken,
      inviteUrl: `${req.protocol}://${req.get('host')}/invite/${group.inviteToken}`,
      expiresAt: group.inviteTokenExpires,
      message: 'Einladungslink erfolgreich generiert'
    });
    
  } catch (error) {
    console.error('❌ Error generating invite link:', error);
    res.status(500).json({ 
      message: 'Fehler beim Generieren des Einladungslinks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   GET /api/invites/:token
// @desc    Get invite details by token (PUBLIC ROUTE)
// @access  Public
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Check invite token:', token);
    
    if (!token || token.length < 10) {
      console.log('❌ Invalid token format:', token);
      return res.status(400).json({ 
        success: false,
        message: 'Ungültiger Einladungslink-Format'
      });
    }
    
    // Find group with this token using model method if available
    let group;
    if (Group.findByValidInviteToken) {
      group = await Group.findByValidInviteToken(token);
    } else {
      // Manual query
      group = await Group.findOne({ 
        inviteToken: token,
        inviteTokenExpires: { $gt: new Date() }
      })
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    }
    
    if (!group) {
      console.log('❌ No valid invite found for token:', token);
      return res.status(404).json({ 
        success: false,
        message: 'Einladungslink ist ungültig oder abgelaufen',
        expired: true
      });
    }
    
    // Check if group has free spots
    const hasSpace = group.members.length < group.maxParticipants;
    
    console.log('✅ Valid invite found:', {
      groupName: group.name,
      memberCount: group.members.length,
      maxParticipants: group.maxParticipants,
      hasSpace
    });
    
    // Return group details for invite page
    res.json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        creator: group.creator,
        memberCount: group.members.length,
        maxParticipants: group.maxParticipants,
        hasSpace,
        travelDateFrom: group.travelDateFrom,
        travelDateTo: group.travelDateTo,
        budgetMin: group.budgetMin,
        budgetMax: group.budgetMax,
        preferences: group.preferences,
        status: group.status,
        members: group.members // Include for member preview
      },
      canJoin: hasSpace,
      expiresAt: group.inviteTokenExpires
    });
    
  } catch (error) {
    console.error('❌ Error checking invite:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Prüfen der Einladung',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   POST /api/invites/:token/join
// @desc    Join group via invite link
// @access  Private
router.post('/:token/join', auth, async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('👥 User tries to join group:', {
      token,
      userId: req.user.id,
      userEmail: req.user.email
    });
    
    // Find group with this token
    const group = await Group.findOne({ 
      inviteToken: token,
      inviteTokenExpires: { $gt: new Date() }
    });
    
    if (!group) {
      console.log('❌ Invalid or expired token:', token);
      return res.status(404).json({ 
        success: false,
        message: 'Einladungslink ist ungültig oder abgelaufen'
      });
    }
    
    // Use model method if available
    if (group.canUserJoinViaInvite && group.addUserViaInvite) {
      const canJoinResult = group.canUserJoinViaInvite(req.user.id);
      
      if (!canJoinResult.canJoin) {
        console.log('❌ User cannot join:', canJoinResult.reason);
        return res.status(400).json({ 
          success: false,
          message: canJoinResult.reason
        });
      }
      
      // Add user using model method
      group.addUserViaInvite(req.user.id);
      await group.save();
      
    } else {
      // Manual check and add
      const isAlreadyMember = group.members.some(member => 
        member.user.toString() === req.user.id.toString()
      );
      
      if (isAlreadyMember) {
        console.log('❌ User already member:', req.user.id);
        return res.status(400).json({ 
          success: false,
          message: 'Sie sind bereits Mitglied dieser Gruppe'
        });
      }
      
      if (group.members.length >= group.maxParticipants) {
        console.log('❌ Group full:', group.members.length, '>=', group.maxParticipants);
        return res.status(400).json({ 
          success: false,
          message: 'Die Gruppe ist bereits voll'
        });
      }
      
      // Add user to group
      group.members.push({
        user: req.user.id,
        role: 'member',
        joinedAt: new Date()
      });
      
      await group.save();
    }
    
    console.log('✅ User successfully added to group:', {
      user: req.user.email,
      group: group.name,
      newMemberCount: group.members.length
    });
    
    // Load updated group for response
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    res.json({
      success: true,
      message: `Willkommen in der Gruppe "${group.name}"!`,
      group: updatedGroup
    });
    
  } catch (error) {
    console.error('❌ Error joining group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Beitreten zur Gruppe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   DELETE /api/invites/:groupId/revoke
// @desc    Revoke invite link for a group
// @access  Private (Admin only)
router.delete('/:groupId/revoke', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log('🚫 Revoke invite link for group:', groupId);
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Check admin permission
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Nur Gruppen-Admins können Einladungslinks widerrufen' 
      });
    }
    
    // Use model method if available
    if (group.revokeInviteToken) {
      group.revokeInviteToken();
    } else {
      // Manual removal
      group.inviteToken = undefined;
      group.inviteTokenExpires = undefined;
    }
    
    await group.save();
    
    console.log('✅ Invite link revoked for group:', group.name);
    
    res.json({
      success: true,
      message: 'Einladungslink wurde widerrufen'
    });
    
  } catch (error) {
    console.error('❌ Error revoking invite link:', error);
    res.status(500).json({ 
      message: 'Fehler beim Widerrufen des Einladungslinks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   GET /api/invites/group/:groupId/current
// @desc    Get current invite link for a group
// @access  Private (Admin only)
router.get('/group/:groupId/current', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log('📋 Get current invite for group:', groupId);
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Check admin permission
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Nur Gruppen-Admins können Einladungslinks einsehen' 
      });
    }
    
    // Check if active invite link exists using virtual if available
    let hasActiveInvite;
    if (group.hasActiveInvite !== undefined) {
      hasActiveInvite = group.hasActiveInvite;
    } else {
      hasActiveInvite = group.inviteToken && 
                       group.inviteTokenExpires && 
                       group.inviteTokenExpires > new Date();
    }
    
    if (hasActiveInvite) {
      res.json({
        success: true,
        hasActiveInvite: true,
        inviteToken: group.inviteToken,
        inviteUrl: group.inviteUrl || `${req.protocol}://${req.get('host')}/invite/${group.inviteToken}`,
        expiresAt: group.inviteTokenExpires
      });
    } else {
      res.json({
        success: true,
        hasActiveInvite: false,
        message: 'Kein aktiver Einladungslink vorhanden'
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting invite link:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Einladungslinks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// Test route for debugging - REMOVE IN PRODUCTION
router.get('/debug/test', (req, res) => {
  console.log('🧪 Debug test route called');
  res.json({
    success: true,
    message: 'Invite routes are working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: [
      'POST /api/invites/generate',
      'GET /api/invites/:token',
      'POST /api/invites/:token/join',
      'DELETE /api/invites/:groupId/revoke',
      'GET /api/invites/group/:groupId/current'
    ]
  });
});

module.exports = router;