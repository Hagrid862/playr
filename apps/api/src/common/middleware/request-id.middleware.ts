import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '../utils/response.helper';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id']?.toString() || generateRequestId();

    // Attach to request object for internal use
    req.id = requestId;
    req.startTime = Date.now();

    // Attach to response header immediately so it's there even if we crash later
    res.setHeader('x-request-id', requestId);

    next();
  }
}
