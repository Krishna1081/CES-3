const express = require('express');
const { Router } = require('express');
const router = Router(); 

const { User } = require('../schema');

router.post('/api/users', async (req, res) => {
    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password });  
    res.json({ message: 'User created successfully', user });
});

module.exports = router;