const express = require('express')
const path = require('path')
const logger = require('morgan')

const server = express()

server.use(logger('dev'))
server.use('/', express.static(path.join(__dirname, 'public')))

module.exports = server
