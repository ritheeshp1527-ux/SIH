import { VoyageController } from './src/controllers/voyage.controller';
import { Request, Response } from 'express';

async function runTest(sourcePort: string, destinationPort: string, speed: number) {
  const controller = new VoyageController();

  const req = {
    body: {
      sourcePort,
      destinationPort,
      vesselSpeed: speed
    }
  } as Request;

  let responseData: any = null;
  let statusCode = 200;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    }
  } as unknown as Response;

  console.log(`\n\n--- Running ${sourcePort} -> ${destinationPort} at ${speed} kts ---`);
  await controller.getVoyage(req, res);

  console.log(`Status Code: ${statusCode}`);
  console.log(`Number of candidates generated: ${responseData?.routes?.length}`);
  
  if (responseData && responseData.fuelModelInput) {
    const handoff = responseData.fuelModelInput;
    console.log(`\nFuel Model Handoff Generated for Route: ${handoff.routeId}`);
    console.log(`  Source: ${handoff.sourcePort}, Destination: ${handoff.destinationPort}`);
    console.log(`  Distance: ${Math.round(handoff.distanceNm)} NM, Duration: ${Math.round(handoff.durationHours)} hours`);
    console.log(`  Marine Coverage Ratio: ${handoff.marineCoverageRatio}`);
    console.log(`  Points in handoff: ${handoff.environmentalPoints.length}`);
    
    // Check missing marine data behavior on the last point
    const lastPoint = handoff.environmentalPoints[handoff.environmentalPoints.length - 1];
    console.log(`  Last Point Wind Speed: ${lastPoint.windSpeed}`);
    console.log(`  Last Point Significant Wave Height: ${lastPoint.significantWaveHeight}`);
    console.log(`  Last Point Ocean Current Speed: ${lastPoint.oceanCurrentSpeed}`);
    console.log(`  Last Point Visibility: ${lastPoint.visibility}`);
  } else {
    console.log('NO FUEL MODEL HANDOFF FOUND!');
  }
}

async function runAll() {
  await runTest('USNYC', 'NLRTM', 15);
  await runTest('INBOM', 'USNYC', 29); // Fast trip, but long distance
  process.exit(0);
}

runAll();
