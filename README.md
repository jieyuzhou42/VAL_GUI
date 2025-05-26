# VAL GUI

This repository implements the front-end GUI for **VAL**, an interactive agent system using **Hierarchical Task Network (HTN)** planning. The interface is built with **React** and visualized using **ReactFlow**. It communicates with the VAL back end through **WebSockets**.


## 🧩 How to Run VAL GUI and Agent

### 1. GUI Setup

Make sure [Node.js](https://nodejs.org) is installed.

Then, in the GUI project directory, run:

```bash
npm install   # Run this only once to install dependencies
npm run dev   # Start the development server
```
### 2. VAL Agent Setup
Make sure you have cloned the [VAL backend repository](https://github.com/Teachable-AI-Lab/val.git).
In one terminal, navigate to the backend directory and start the server:
```bash
python val/user_interfaces/launch_server.py
```
In a second terminal, run the test script for the desired game environment:
```bash
python tests/<your_test_file>.py
```

## Interaction Flow (Blocking Framework)

The current framework uses a **blocking model**:

- After VAL sends a task decomposition to the front end, it **waits for user input** before continuing.
- **WebSocket listeners** detect which UI event (e.g., a button click) is triggered and send the corresponding response back to VAL.
- The system is **not yet event-driven** (e.g., no asynchronous POST requests to a back-end API).

Buttons like **"Edit"**, **"More Options"**, and **"Add Method"** are rendered within the `ConfirmBestMatch` component.

When a user clicks one of these:

1. The front end emits a socket response and sets the current message to `null`.
2. VAL emits a new message with updated task options.

##  Rendering Logic

Task decompositions are rendered as a graph of nodes using ReactFlow.

- Each task, method option, or control button is a node.
- Nodes are passed through multiple components, where their values are modified. But only renders in the display.jsx.  

##  Key Components

###  Task Identifier Logic

Each task is tracked using a **hash value**, which connects its identity across planning phases.

#### Example:
- **Phase 1**: `Get(onion)` is a **subtask** of the method `MakeSoupBase(X)`.
- **Phase 2**: `Get(onion)` becomes a **root task**, with its own decomposition like:

