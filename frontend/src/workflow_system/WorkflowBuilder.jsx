import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const WorkflowBuilder = () => {
  const { api } = useAuth();
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [workflowCategory, setWorkflowCategory] = useState('');
  const [nodes, setNodes] = useState([
    { id: '1', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } }
  ]);
  const [connections, setConnections] = useState([]);
  const [draggedNodeType, setDraggedNodeType] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const nodeTypes = [
    { type: 'start', label: 'Start', color: 'bg-green-500' },
    { type: 'condition', label: 'Condition', color: 'bg-yellow-500' },
    { type: 'action', label: 'Action', color: 'bg-blue-500' },
    { type: 'approval', label: 'Approval', color: 'bg-purple-500' },
    { type: 'end', label: 'End', color: 'bg-red-500' }
  ];

  const handleDragStart = (e, nodeType) => {
    setDraggedNodeType(nodeType);
    e.dataTransfer.setData('nodeType', nodeType.type);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode = {
      id: `node-${Date.now()}`,
      type: draggedNodeType.type,
      position: { x, y },
      data: {
        label: draggedNodeType.label,
        ...(draggedNodeType.type === 'action' && { actionType: 'assign_ticket', assigneeId: null }),
        ...(draggedNodeType.type === 'condition' && { conditionType: 'ticket_priority', priority: 'normal' }),
        ...(draggedNodeType.type === 'approval' && { approverId: null })
      }
    };

    setNodes([...nodes, newNode]);
    setDraggedNodeType(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const updateNodeData = (nodeId, newData) => {
    setNodes(nodes.map(node =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
    ));
  };

  const deleteNode = (nodeId) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(conn =>
      conn.source !== nodeId && conn.target !== nodeId
    ));
    setSelectedNode(null);
  };

  /*
    const addConnection = (sourceNodeId, targetNodeId) => {
      const newConnection = {
        id: `conn-${Date.now()}`,
        source: sourceNodeId,
        target: targetNodeId
      };
      setConnections([...connections, newConnection]);
    };
  */

  const saveWorkflow = async () => {
    if (!workflowName || !workflowCategory) {
      setError('Please provide workflow name and category');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const workflowDefinition = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        connections: connections.map(conn => ({
          id: conn.id,
          source: conn.source,
          target: conn.target
        }))
      };

      await api.post('/workflows/templates', {
        name: workflowName,
        description: workflowDesc,
        category: workflowCategory,
        definition: workflowDefinition
      });

      setSuccess('Workflow saved successfully!');
      setTimeout(() => {
        setSuccess(null);
        setWorkflowName('');
        setWorkflowDesc('');
        setWorkflowCategory('');
        setNodes([{ id: '1', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } }]);
        setConnections([]);
      }, 2000);
    } catch (err) {
      setError('Failed to save workflow');
      console.error('Error saving workflow:', err);
    } finally {
      setSaving(false);
    }
  };

  const getNodeColor = (type) => {
    const nodeType = nodeTypes.find(nt => nt.type === type);
    return nodeType ? nodeType.color : 'bg-gray-500';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Workflow Builder</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Workflow Info Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Workflow Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter workflow name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={workflowDesc}
                onChange={(e) => setWorkflowDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Enter workflow description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={workflowCategory}
                onChange={(e) => setWorkflowCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                <option value="ticket_processing">Ticket Processing</option>
                <option value="approval_process">Approval Process</option>
                <option value="escalation">Escalation</option>
                <option value="notification">Notification</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              onClick={saveWorkflow}
              disabled={saving}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                }`}
            >
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Available Nodes</h3>
            <div className="space-y-2">
              {nodeTypes.map((nodeType) => (
                <div
                  key={nodeType.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, nodeType)}
                  className={`p-3 rounded-md cursor-move ${nodeType.color} text-white`}
                >
                  {nodeType.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workflow Canvas */}
        <div className="lg:col-span-3">
          <div
            className="bg-white rounded-lg shadow-md h-[600px] relative overflow-hidden"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* Render nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`absolute w-32 h-16 rounded-md flex items-center justify-center text-white text-sm font-medium cursor-pointer border-2 ${selectedNode?.id === node.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent'
                  } ${getNodeColor(node.type)}`}
                style={{ left: node.position.x, top: node.position.y }}
                onClick={() => handleNodeClick(node)}
              >
                {node.data.label}
              </div>
            ))}

            {/* Render connections */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {connections.map((conn) => {
                const sourceNode = nodes.find(n => n.id === conn.source);
                const targetNode = nodes.find(n => n.id === conn.target);

                if (!sourceNode || !targetNode) return null;

                const sourceX = sourceNode.position.x + 64; // Half of width
                const sourceY = sourceNode.position.y + 32; // Half of height
                const targetX = targetNode.position.x + 64;
                const targetY = targetNode.position.y + 32;

                return (
                  <line
                    key={conn.id}
                    x1={sourceX}
                    y1={sourceY}
                    x2={targetX}
                    y2={targetY}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
            </svg>

            {nodes.length === 1 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Drag nodes from the sidebar to build your workflow
              </div>
            )}
          </div>

          {/* Node Properties Panel */}
          {selectedNode && (
            <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-800">Node Properties: {selectedNode.data.label}</h3>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete Node
                </button>
              </div>

              {selectedNode.type === 'action' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                    <select
                      value={selectedNode.data.actionType || 'assign_ticket'}
                      onChange={(e) => updateNodeData(selectedNode.id, { actionType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="assign_ticket">Assign Ticket</option>
                      <option value="send_notification">Send Notification</option>
                      <option value="update_status">Update Status</option>
                    </select>
                  </div>

                  {(selectedNode.data.actionType === 'assign_ticket' || selectedNode.data.actionType === 'approval') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                      <select
                        value={selectedNode.data.assigneeId || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { assigneeId: parseInt(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select assignee</option>
                        <option value="1">John Doe (Admin)</option>
                        <option value="2">Jane Smith (Manager)</option>
                        <option value="3">Bob Johnson (Agent)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition Type</label>
                    <select
                      value={selectedNode.data.conditionType || 'ticket_priority'}
                      onChange={(e) => updateNodeData(selectedNode.id, { conditionType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ticket_priority">Ticket Priority</option>
                      <option value="ticket_category">Ticket Category</option>
                      <option value="user_role">User Role</option>
                      <option value="custom">Custom Condition</option>
                    </select>
                  </div>

                  {selectedNode.data.conditionType === 'ticket_priority' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Required Priority</label>
                      <select
                        value={selectedNode.data.priority || 'normal'}
                        onChange={(e) => updateNodeData(selectedNode.id, { priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === 'approval' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approver</label>
                  <select
                    value={selectedNode.data.approverId || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { approverId: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select approver</option>
                    <option value="1">John Doe (Admin)</option>
                    <option value="2">Jane Smith (Manager)</option>
                    <option value="3">Bob Johnson (Agent)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;