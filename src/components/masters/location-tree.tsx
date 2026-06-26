"use client";

import * as React from "react";
import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Globe,
  MapPin,
  Landmark,
  Warehouse,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

type WarehouseNode = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
};

type CityNode = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  warehouses: WarehouseNode[];
};

type StateNode = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  cities: CityNode[];
};

type RegionNode = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  states: StateNode[];
};

type CompanyNode = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  regions: RegionNode[];
};

export type LocationTreeData = CompanyNode[];

type NodeLevel = "company" | "region" | "state" | "city" | "warehouse";

interface LocationTreeProps {
  data: LocationTreeData;
  onAdd: (level: NodeLevel, parentId?: string) => void;
  onEdit: (level: NodeLevel, item: Record<string, unknown>) => void;
  onDelete: (level: NodeLevel, id: string, name: string) => void;
}

// ============================================================
// TREE NODE
// ============================================================

function TreeNode({
  level,
  icon: Icon,
  name,
  code,
  isActive,
  children,
  hasChildren,
  depth,
  onAdd,
  onEdit,
  onDelete,
  childLevel,
  id,
}: {
  level: NodeLevel;
  icon: React.ElementType;
  name: string;
  code: string;
  isActive: boolean;
  children?: React.ReactNode;
  hasChildren: boolean;
  depth: number;
  onAdd?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  childLevel?: string;
  id: string;
}) {
  const [expanded, setExpanded] = useState(depth === 0);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Expand / Collapse */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}

        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium text-sm">{name}</span>
        <span className="text-xs text-muted-foreground">({code})</span>

        {!isActive && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Inactive
          </Badge>
        )}

        {/* Action Buttons */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAdd && childLevel && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onAdd}
              title={`Add ${childLevel}`}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            title={`Edit ${level}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            title={`Delete ${level}`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {expanded && children}
    </div>
  );
}

// ============================================================
// LOCATION TREE
// ============================================================

export function LocationTree({
  data,
  onAdd,
  onEdit,
  onDelete,
}: LocationTreeProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Building2 className="size-12 mb-3 opacity-40" />
        <p className="text-sm">No locations found. Add a company to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {data.map((company) => (
        <TreeNode
          key={company.id}
          id={company.id}
          level="company"
          icon={Building2}
          name={company.name}
          code={company.code}
          isActive={company.isActive}
          hasChildren={company.regions.length > 0}
          depth={0}
          onAdd={() => onAdd("region", company.id)}
          onEdit={() => onEdit("company", { ...company })}
          onDelete={() => onDelete("company", company.id, company.name)}
          childLevel="Region"
        >
          {company.regions.map((region) => (
            <TreeNode
              key={region.id}
              id={region.id}
              level="region"
              icon={Globe}
              name={region.name}
              code={region.code}
              isActive={region.isActive}
              hasChildren={region.states.length > 0}
              depth={1}
              onAdd={() => onAdd("state", region.id)}
              onEdit={() =>
                onEdit("region", {
                  ...region,
                  companyId: company.id,
                })
              }
              onDelete={() => onDelete("region", region.id, region.name)}
              childLevel="State"
            >
              {region.states.map((state) => (
                <TreeNode
                  key={state.id}
                  id={state.id}
                  level="state"
                  icon={Landmark}
                  name={state.name}
                  code={state.code}
                  isActive={state.isActive}
                  hasChildren={state.cities.length > 0}
                  depth={2}
                  onAdd={() => onAdd("city", state.id)}
                  onEdit={() =>
                    onEdit("state", {
                      ...state,
                      regionId: region.id,
                    })
                  }
                  onDelete={() => onDelete("state", state.id, state.name)}
                  childLevel="City"
                >
                  {state.cities.map((city) => (
                    <TreeNode
                      key={city.id}
                      id={city.id}
                      level="city"
                      icon={MapPin}
                      name={city.name}
                      code={city.code}
                      isActive={city.isActive}
                      hasChildren={city.warehouses.length > 0}
                      depth={3}
                      onAdd={() => onAdd("warehouse", city.id)}
                      onEdit={() =>
                        onEdit("city", {
                          ...city,
                          stateId: state.id,
                        })
                      }
                      onDelete={() => onDelete("city", city.id, city.name)}
                      childLevel="Warehouse"
                    >
                      {city.warehouses.map((wh) => (
                        <TreeNode
                          key={wh.id}
                          id={wh.id}
                          level="warehouse"
                          icon={Warehouse}
                          name={wh.name}
                          code={wh.code}
                          isActive={wh.isActive}
                          hasChildren={false}
                          depth={4}
                          onEdit={() =>
                            onEdit("warehouse", {
                              ...wh,
                              cityId: city.id,
                            })
                          }
                          onDelete={() =>
                            onDelete("warehouse", wh.id, wh.name)
                          }
                        />
                      ))}
                    </TreeNode>
                  ))}
                </TreeNode>
              ))}
            </TreeNode>
          ))}
        </TreeNode>
      ))}
    </div>
  );
}
