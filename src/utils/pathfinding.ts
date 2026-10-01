import {
  HospitalData,
  NavNode,
  NavEdge,
  RouteResult,
  TurnStep,
  TravelMode,
  FloorId,
  DoorCode,
} from '../types/hospital';

interface AdjacencyItem {
  toNodeId: string;
  distance: number;
  edge: NavEdge;
}

export function buildAdjacencyList(nodes: NavNode[], edges: NavEdge[], mode: TravelMode) {
  const nodeMap = new Map<string, NavNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const adj = new Map<string, AdjacencyItem[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((edge) => {
    // If wheelchair / trolley accessible only and this is stairs, skip
    if ((mode === 'accessible' || mode === 'trolley') && edge.isVerticalTransition && edge.accessibleOnly === false) {
      return;
    }

    const fromList = adj.get(edge.fromNodeId);
    const toList = adj.get(edge.toNodeId);

    // Cost calculation: stairs take more effort, elevators have slight wait time
    let cost = edge.distanceMeters;
    if (edge.isVerticalTransition) {
      if (edge.accessibleOnly) {
        // Elevator: add 15s wait penalty (equivalent to 15m)
        cost += 15;
      } else {
        // Stairs: slightly higher physical cost
        cost += 8;
      }
    }

    if (fromList) {
      fromList.push({ toNodeId: edge.toNodeId, distance: cost, edge });
    }
    // Edges in indoor corridors and elevators are bidirectional
    if (toList) {
      toList.push({ toNodeId: edge.fromNodeId, distance: cost, edge });
    }
  });

  return { nodeMap, adj };
}

export function findShortestPath(
  data: HospitalData,
  startNodeId: string,
  targetNodeId: string,
  mode: TravelMode = 'walking'
): RouteResult | null {
  if (startNodeId === targetNodeId) {
    const node = data.nodes.find((n) => n.id === startNodeId);
    if (!node) return null;
    return {
      steps: [
        {
          stepIndex: 1,
          instruction: 'You are already at your destination.',
          turnType: 'arrive',
          distanceMeters: 0,
          floorId: node.floorId,
          nodeId: startNodeId,
          cumulativeDistanceMeters: 0,
          estimatedSeconds: 0,
        },
      ],
      pathNodeIds: [startNodeId],
      totalDistanceMeters: 0,
      estimatedTotalSeconds: 0,
      floorsTraversed: [node.floorId],
    };
  }

  const { nodeMap, adj } = buildAdjacencyList(data.nodes, data.edges, mode);
  if (!nodeMap.has(startNodeId) || !nodeMap.has(targetNodeId)) {
    return null;
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edge: NavEdge }>();
  const visited = new Set<string>();

  data.nodes.forEach((n) => distances.set(n.id, Infinity));
  distances.set(startNodeId, 0);

  // Simple min-heap simulation / priority queue using array
  const queue: { nodeId: string; dist: number }[] = [{ nodeId: startNodeId, dist: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const { nodeId: current, dist } = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === targetNodeId) break;

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.toNodeId)) continue;

      const alt = dist + neighbor.distance;
      if (alt < (distances.get(neighbor.toNodeId) ?? Infinity)) {
        distances.set(neighbor.toNodeId, alt);
        previous.set(neighbor.toNodeId, { nodeId: current, edge: neighbor.edge });
        queue.push({ nodeId: neighbor.toNodeId, dist: alt });
      }
    }
  }

  if (!previous.has(targetNodeId)) {
    return null; // No path found
  }

  // Reconstruct path
  const pathNodes: string[] = [];
  let curr = targetNodeId;
  pathNodes.unshift(curr);

  while (curr !== startNodeId) {
    const prev = previous.get(curr);
    if (!prev) break;
    curr = prev.nodeId;
    pathNodes.unshift(curr);
  }

  // Generate turns and instructions
  return generateRouteResult(data, pathNodes);
}

function calculateBearing(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function getTurnType(
  angleDiff: number
): 'straight' | 'slight-left' | 'left' | 'sharp-left' | 'slight-right' | 'right' | 'sharp-right' {
  // Normalize angleDiff to [-180, 180]
  let diff = angleDiff;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  if (Math.abs(diff) < 25) return 'straight';
  if (diff > 25 && diff < 65) return 'slight-right';
  if (diff >= 65 && diff < 120) return 'right';
  if (diff >= 120) return 'sharp-right';
  if (diff < -25 && diff > -65) return 'slight-left';
  if (diff <= -65 && diff > -120) return 'left';
  return 'sharp-left';
}

function getFloorDisplayName(floorId: FloorId): string {
  switch (floorId) {
    case 'F1':
      return 'First Floor (Main Floor)';
    case 'F2':
      return 'Floor 2 (Upper Wards)';
    case 'F3':
      return 'Floor 3 (Specialty Wards)';
    default:
      return floorId;
  }
}

export function generateRouteResult(data: HospitalData, pathNodeIds: string[]): RouteResult {
  const nodeMap = new Map<string, NavNode>();
  data.nodes.forEach((n) => nodeMap.set(n.id, n));

  const doorCodeMap = new Map<string, DoorCode>();
  data.doorCodes.forEach((d) => doorCodeMap.set(d.id, d));

  const steps: TurnStep[] = [];
  const floorsTraversedSet = new Set<FloorId>();

  let cumulativeDistance = 0;
  let totalDistance = 0;

  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const currentNode = nodeMap.get(pathNodeIds[i])!;
    const nextNode = nodeMap.get(pathNodeIds[i + 1])!;
    floorsTraversedSet.add(currentNode.floorId);
    floorsTraversedSet.add(nextNode.floorId);

    // Calculate segment distance
    const isVertical = currentNode.floorId !== nextNode.floorId;
    let segDist = 0;

    if (isVertical) {
      segDist = 8; // standard vertical distance
    } else {
      const dx = nextNode.x - currentNode.x;
      const dy = nextNode.y - currentNode.y;
      segDist = Math.round(Math.sqrt(dx * dx + dy * dy) * 0.15); // scaled to hospital meters
      if (segDist < 3) segDist = 4;
    }

    totalDistance += segDist;

    // Check for door codes
    let doorCodeObj: DoorCode | undefined = undefined;
    if (nextNode.doorCodeId && doorCodeMap.has(nextNode.doorCodeId)) {
      doorCodeObj = doorCodeMap.get(nextNode.doorCodeId);
    } else if (currentNode.doorCodeId && doorCodeMap.has(currentNode.doorCodeId)) {
      doorCodeObj = doorCodeMap.get(currentNode.doorCodeId);
    }

    // Determine instruction
    let instruction = '';
    let turnType: TurnStep['turnType'] = 'straight';

    if (isVertical) {
      const targetFloorName = getFloorDisplayName(nextNode.floorId);
      if (currentNode.isElevator || nextNode.isElevator) {
        turnType = 'elevator';
        instruction = `Take elevator to ${targetFloorName}`;
      } else {
        turnType = 'stairs';
        instruction = `Take stairs to ${targetFloorName}`;
      }
    } else if (i === 0) {
      instruction = `Head towards ${nextNode.label || 'corridor'}`;
      turnType = 'straight';
    } else {
      const prevNode = nodeMap.get(pathNodeIds[i - 1])!;
      if (prevNode.floorId !== currentNode.floorId) {
        instruction = `Exit and proceed along ${nextNode.label || 'hallway'}`;
        turnType = 'straight';
      } else {
        const b1 = calculateBearing(prevNode, currentNode);
        const b2 = calculateBearing(currentNode, nextNode);
        const diff = b2 - b1;
        turnType = getTurnType(diff);

        const hallwayLabel = nextNode.label ? ` toward ${nextNode.label}` : '';
        switch (turnType) {
          case 'straight':
            instruction = `Continue straight for ${segDist}m${hallwayLabel}`;
            break;
          case 'slight-right':
            instruction = `Bear slight right${hallwayLabel}`;
            break;
          case 'right':
            instruction = `Turn right${hallwayLabel}`;
            break;
          case 'sharp-right':
            instruction = `Turn sharp right${hallwayLabel}`;
            break;
          case 'slight-left':
            instruction = `Bear slight left${hallwayLabel}`;
            break;
          case 'left':
            instruction = `Turn left${hallwayLabel}`;
            break;
          case 'sharp-left':
            instruction = `Turn sharp left${hallwayLabel}`;
            break;
        }
      }
    }

    if (doorCodeObj) {
      instruction += ` · Requires Keypad Access: ${doorCodeObj.code}`;
      if (turnType === 'straight') {
        turnType = 'door-code';
      }
    }

    cumulativeDistance += segDist;

    steps.push({
      stepIndex: steps.length + 1,
      instruction,
      turnType,
      distanceMeters: segDist,
      floorId: currentNode.floorId,
      doorCode: doorCodeObj,
      nodeId: currentNode.id,
      cumulativeDistanceMeters: cumulativeDistance,
      estimatedSeconds: Math.round(cumulativeDistance / 1.15), // walking speed 1.15 m/s
    });
  }

  // Final Arrival Step
  const lastNode = nodeMap.get(pathNodeIds[pathNodeIds.length - 1])!;
  steps.push({
    stepIndex: steps.length + 1,
    instruction: `Arrive at destination (${lastNode.label || 'Target location'})`,
    turnType: 'arrive',
    distanceMeters: 0,
    floorId: lastNode.floorId,
    nodeId: lastNode.id,
    cumulativeDistanceMeters: cumulativeDistance,
    estimatedSeconds: Math.round(cumulativeDistance / 1.15),
  });

  return {
    steps,
    pathNodeIds,
    totalDistanceMeters: totalDistance,
    estimatedTotalSeconds: Math.round(totalDistance / 1.15),
    floorsTraversed: Array.from(floorsTraversedSet),
  };
}

/**
 * Optimizes a collection run (Traveling Courier Route)
 * Given user's starting location and an array of target room IDs (e.g. transfusion form dropboxes),
 * computes a near-optimal sequence of pickups using greedy nearest-neighbor ordering,
 * and builds a combined route.
 */
export function calculateOptimalCourierRoute(
  data: HospitalData,
  startRoomId: string,
  targetRoomIds: string[],
  returnToBloodBank: boolean = true
): {
  orderedRoomIds: string[];
  totalDistanceMeters: number;
  totalEstimatedSeconds: number;
  routes: RouteResult[];
} {
  const roomMap = new Map(data.rooms.map((r) => [r.id, r]));
  const startRoom = roomMap.get(startRoomId);
  if (!startRoom || targetRoomIds.length === 0) {
    return { orderedRoomIds: [], totalDistanceMeters: 0, totalEstimatedSeconds: 0, routes: [] };
  }

  // Filter valid uncollected targets
  const remaining = [...targetRoomIds.filter((id) => id !== startRoomId && roomMap.has(id))];
  const orderedRoomIds: string[] = [];
  const routes: RouteResult[] = [];

  let currentRoomId = startRoomId;
  let totalDistance = 0;
  let totalSeconds = 0;

  while (remaining.length > 0) {
    const currentRoom = roomMap.get(currentRoomId)!;
    let closestIndex = -1;
    let shortestDist = Infinity;
    let bestRoute: RouteResult | null = null;

    for (let i = 0; i < remaining.length; i++) {
      const candidateRoom = roomMap.get(remaining[i])!;
      const fromNodeId = currentRoom.doorNodeId || data.nodes[0]?.id || '';
      const toNodeId = candidateRoom.doorNodeId || data.nodes[0]?.id || '';
      const route = findShortestPath(data, fromNodeId, toNodeId);
      if (route && route.totalDistanceMeters < shortestDist) {
        shortestDist = route.totalDistanceMeters;
        closestIndex = i;
        bestRoute = route;
      }
    }

    if (closestIndex === -1 || !bestRoute) {
      // Fallback: take next in list if unreachable directly
      const nextId = remaining.shift()!;
      orderedRoomIds.push(nextId);
      currentRoomId = nextId;
      continue;
    }

    const nextRoomId = remaining.splice(closestIndex, 1)[0];
    orderedRoomIds.push(nextRoomId);
    routes.push(bestRoute);
    totalDistance += bestRoute.totalDistanceMeters;
    totalSeconds += bestRoute.estimatedTotalSeconds;
    currentRoomId = nextRoomId;
  }

  // Optional return leg to Pathology / Blood Bank
  if (returnToBloodBank) {
    const bloodBankRoom = data.rooms.find((r) => r.id === 'r-pathology') || data.rooms.find((r) => r.id === 'r-blood-tests');
    if (bloodBankRoom && currentRoomId !== bloodBankRoom.id) {
      const fromNodeId = roomMap.get(currentRoomId)?.doorNodeId || data.nodes[0]?.id || '';
      const toNodeId = bloodBankRoom.doorNodeId || data.nodes[0]?.id || '';
      const returnRoute = findShortestPath(data, fromNodeId, toNodeId);
      if (returnRoute) {
        orderedRoomIds.push(bloodBankRoom.id);
        routes.push(returnRoute);
        totalDistance += returnRoute.totalDistanceMeters;
        totalSeconds += returnRoute.estimatedTotalSeconds;
      }
    }
  }

  return {
    orderedRoomIds,
    totalDistanceMeters: totalDistance,
    totalEstimatedSeconds: totalSeconds,
    routes,
  };
}
