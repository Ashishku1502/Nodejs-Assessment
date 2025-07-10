# Node.js Assessment

## Overview
This project is a Node.js application designed for assessment purposes. It includes models, routes, and utilities for managing accounts, agents, carriers, lines of business (LOB), messages, policies, and users. The project also features CSV data processing and database setup scripts.

## Project Structure
```
Nodejs Assessment/
  ├── app.js                  # Main application entry point
  ├── config/
  │     └── database.js       # Database configuration
  ├── models/                 # Mongoose models (Account, Agent, Carrier, LOB, Message, Policy, User)
  ├── routes/                 # Express route handlers (policy, system, upload)
  ├── worker/
  │     └── dataProcessor.js  # Data processing worker
  ├── setup-database.js       # Script to initialize the database
  ├── test-server.js          # Test server script
  ├── data-sheet - Node js Assesment (2).csv # Sample data file
  ├── package.json            # Project metadata and dependencies
  └── package-lock.json       # Dependency lock file
```

## Setup Instructions
1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd "Nodejs Assessment"
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure the database**
   - Update `config/database.js` with your MongoDB connection string if needed.

4. **(Optional) Initialize the database**
   ```bash
   node setup-database.js
   ```

5. **Start the application**
   ```bash
   node app.js
   ```

## Usage
- The application exposes various API endpoints for managing policies, users, and more.
- Use tools like Postman or curl to interact with the API.
- For data processing, refer to the scripts in the `worker/` directory.

## Notes
- Ensure MongoDB is running and accessible before starting the app.
- The provided CSV file can be used for data import or testing.

## License
This project is for assessment and educational purposes. 
