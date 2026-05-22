// USC Protocol v1.0.0 — types mirroring docs/spec+protocol.md §4 + §6.

export type UscTier = 'cognitive' | 'temporal' | 'spatial' | 'agent';

export interface UscProvenance {
  source_type: string;
  source_uri: string;
  derivation_chain?: Array<{
    primitive_identifier: string;
    platform?: string;
    relation: string;
  }>;
  fidelity: 'high' | 'medium' | 'low' | 'projected';
  captured_at: string; // ISO 8601
  captured_by: string;
}

export interface UscPrimitive {
  identifier: string;
  uri?: string;
  workspace_id: string;
  spatial: {
    s: [number, number, number];
    frame: string;
    σs: number;
  } | null;
  temporal: {
    t: string; // ISO 8601
    σt: number;
  };
  provenance: UscProvenance;
  tier: UscTier;
  embedding: number[] | null;
  payload?: Record<string, unknown>;
}

export interface UscQueryRequest {
  spatial?: {
    s_q: [number, number, number];
    frame: string;
    r_s: number;
  };
  temporal?: {
    t_q: string;
    r_t: number;
  };
  tier?: UscTier | UscTier[];
  semantic_text?: string;
  source_type?: string | string[];
  limit?: number;
  threshold?: number;
  include_aspatial?: boolean;
  include_projected?: boolean;
  actor_id: string;
}

export interface UscHit {
  primitive: UscPrimitive;
  match_score: number;
  scoring: {
    spatial: number | null;
    temporal: number | null;
    semantic: number | null;
  };
  distances: {
    spatial_m: number | null;
    temporal_s: number | null;
  };
}

export interface UscQueryResponse {
  hits: UscHit[];
  total: number;
  platform: string;
}

export interface UscPlatformInfo {
  platform: string;
  protocol_version: string;
  conformance_level: 'L1' | 'L2' | 'L3';
  tiers: UscTier[];
  source_types: Record<UscTier, string[]>;
  embeddings: {
    model_id: string;
    dimensions: number;
    tiers: UscTier[];
  } | null;
  supports_projection: boolean;
  spatial: {
    supported: boolean;
    declared_frames?: string[];
  };
}
