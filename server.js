const express = require('express')
const path = require('path')
const logger = require('morgan')
const compression = require('compression')
const nocache = require('nocache')

const server = express()

server.use(nocache())
server.use(compression({ filter: shouldCompress }))
server.use(logger('dev'))
server.use('/', express.static(path.join(__dirname, 'public')))

function shouldCompress (req, res) {
	if (req.headers['x-no-compression']) {
		// don't compress responses with this request header
		return false
	}

	// fallback to standard filter function
	return compression.filter(req, res)
}

module.exports = server
