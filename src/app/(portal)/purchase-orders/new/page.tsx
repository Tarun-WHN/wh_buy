"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  createPurchaseOrder,
  getVendorsForPo,
  getRfqForPoPrefill,
} from "@/actions/po.actions";
import { getWarehouses } from "@/actions/requirement.actions";
import { getProductsForSelection } from "@/actions/requirement.actions";

// ============================================================
// TYPES
// ============================================================

interface VendorOption {
  id: string;
  name: string;
  code: string;
  email: string;
  paymentTerms: string | null;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  address: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface LineItem {
  key: string;
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  quantity: string;
  unitPrice: string;
  taxPercent: string;
  remarks: string;
}

// ============================================================
// PAGE
// ============================================================

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rfqIdParam = searchParams.get("rfqId");
  const vendorIdParam = searchParams.get("vendorId");

  const [isPending, startTransition] = useTransition();
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Form state
  const [vendorId, setVendorId] = useState(vendorIdParam || "");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [freightAmount, setFreightAmount] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    {
      key: crypto.randomUUID(),
      productId: "",
      productName: "",
      sku: "",
      uom: "",
      quantity: "1",
      unitPrice: "0",
      taxPercent: "0",
      remarks: "",
    },
  ]);

  // Load vendors and warehouses on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const [vendorList, warehouseList] = await Promise.all([
          getVendorsForPo(),
          getWarehouses(),
        ]);
        setVendors(vendorList as VendorOption[]);
        setWarehouses(warehouseList as unknown as WarehouseOption[]);

        // If coming from RFQ, prefill data
        if (rfqIdParam && vendorIdParam) {
          const quotation = await getRfqForPoPrefill(rfqIdParam, vendorIdParam);
          if (quotation) {
            setVendorId(vendorIdParam);
            setPaymentTerms(quotation.paymentTerms || "");
            setDeliveryTerms(quotation.deliveryTerms || "");
            setShippingAddress(quotation.rfq?.deliveryLocation || "");

            setItems(
              quotation.items.map((qi) => ({
                key: crypto.randomUUID(),
                productId: qi.rfqLineItem.product.id,
                productName: qi.rfqLineItem.product.name,
                sku: qi.rfqLineItem.product.sku,
                uom: qi.rfqLineItem.product.uom,
                quantity: String(qi.quantity),
                unitPrice: String(qi.unitPrice),
                taxPercent: String(qi.taxPercent),
                remarks: qi.remarks || "",
              }))
            );
          }
        }
      } catch {
        // silent
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search products with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const prods = await getProductsForSelection(productSearch || undefined);
          setProducts(prods as ProductOption[]);
        } catch {
          // silent
        }
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [productSearch]);

  // Line item management
  function addLineItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: "",
        productName: "",
        sku: "",
        uom: "",
        quantity: "1",
        unitPrice: "0",
        taxPercent: "0",
        remarks: "",
      },
    ]);
  }

  function removeLineItem(key: string) {
    if (items.length <= 1) {
      toast.error("At least one line item is required");
      return;
    }
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateLineItem(key: string, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );
  }

  function selectProduct(key: string, productId: string | null) {
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (product) {
      setItems((prev) =>
        prev.map((i) =>
          i.key === key
            ? {
                ...i,
                productId,
                productName: product.name,
                sku: product.sku,
                uom: product.uom,
              }
            : i
        )
      );
    }
  }

  // Calculations
  function calcLineTotal(item: LineItem) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const tax = parseFloat(item.taxPercent) || 0;
    const base = qty * price;
    const taxAmt = (base * tax) / 100;
    return { base, taxAmt, total: base + taxAmt };
  }

  const subtotal = items.reduce((sum, item) => sum + calcLineTotal(item).base, 0);
  const taxTotal = items.reduce((sum, item) => sum + calcLineTotal(item).taxAmt, 0);
  const freight = parseFloat(freightAmount) || 0;
  const grandTotal = subtotal + taxTotal + freight;

  // Handle vendor change to auto-fill payment terms
  function handleVendorChange(id: string | null) {
    if (!id) return;
    setVendorId(id);
    const vendor = vendors.find((v) => v.id === id);
    if (vendor?.paymentTerms && !paymentTerms) {
      setPaymentTerms(vendor.paymentTerms);
    }
  }

  // Handle warehouse change to auto-fill shipping address
  function handleWarehouseChange(id: string | null) {
    if (!id) return;
    setWarehouseId(id);
    const wh = warehouses.find((w) => w.id === id);
    if (wh?.address && !shippingAddress) {
      setShippingAddress(`${wh.name} (${wh.code}) - ${wh.address}`);
    }
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (!warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) {
      toast.error("At least one line item with a product is required");
      return;
    }

    try {
      await createPurchaseOrder({
        vendorId,
        warehouseId,
        rfqId: rfqIdParam || undefined,
        paymentTerms: paymentTerms || undefined,
        deliveryTerms: deliveryTerms || undefined,
        deliveryDate: deliveryDate || undefined,
        shippingAddress: shippingAddress || undefined,
        freightAmount: freight,
        remarks: remarks || undefined,
        lineItems: validItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          uom: i.uom,
          quantity: parseFloat(i.quantity) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
          taxPercent: parseFloat(i.taxPercent) || 0,
          remarks: i.remarks || undefined,
        })),
      });

      toast.success("Purchase Order saved as draft");
      router.push("/purchase-orders");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create Purchase Order"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order"
      >
        <Button variant="outline" render={<Link href="/purchase-orders" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        {/* PO Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PO Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select value={vendorId} onValueChange={handleVendorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor">
                    {(value) => {
                      const v = vendors.find((vd) => vd.id === value);
                      return v ? `${v.name} (${v.code})` : "Select vendor";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select value={warehouseId} onValueChange={handleWarehouseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse">
                    {(value) => {
                      const wh = warehouses.find((w) => w.id === value);
                      return wh ? `${wh.name} (${wh.code})` : "Select warehouse";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g., Net 30"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deliveryTerms">Delivery Terms</Label>
              <Input
                id="deliveryTerms"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                placeholder="e.g., FOB Destination"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="freightAmount">Freight Amount</Label>
              <Input
                id="freightAmount"
                type="number"
                min="0"
                step="0.01"
                value={freightAmount}
                onChange={(e) => setFreightAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="shippingAddress">Shipping Address</Label>
              <Textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Shipping address"
                rows={2}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional remarks"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
            >
              <Plus className="mr-1.5 size-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => {
                const calc = calcLineTotal(item);

                return (
                  <div
                    key={item.key}
                    className="rounded-lg border p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Item {index + 1}
                        {item.sku && (
                          <span className="ml-2 text-xs">
                            ({item.sku} - {item.uom})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatCurrency(calc.total)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeLineItem(item.key)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="grid gap-2">
                        <Label>
                          Product <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={item.productId}
                          onValueChange={(val) =>
                            selectProduct(item.key, val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product">
                              {(value) =>
                                value && item.productName
                                  ? `${item.productName} (${item.sku}) - ${item.uom}`
                                  : "Select product"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Search products..."
                                value={productSearch}
                                onChange={(e) =>
                                  setProductSearch(e.target.value)
                                }
                                className="mb-2"
                              />
                            </div>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.sku}) - {p.uom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>
                          Quantity <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.key,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>
                          Unit Price <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(
                              item.key,
                              "unitPrice",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Tax %</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.taxPercent}
                          onChange={(e) =>
                            updateLineItem(
                              item.key,
                              "taxPercent",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Remarks</Label>
                        <Input
                          value={item.remarks}
                          onChange={(e) =>
                            updateLineItem(
                              item.key,
                              "remarks",
                              e.target.value
                            )
                          }
                          placeholder="Remarks"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">
                    {formatCurrency(taxTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Freight</span>
                  <span className="font-medium">
                    {formatCurrency(freight)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-semibold">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            render={<Link href="/purchase-orders" />}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save as Draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}
