import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Divider,
  EmptyState,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
} from "../src/components/ui";

afterEach(() => {
  cleanup();
});

describe("Design System", () => {
  it("renders button variants without crashing", () => {
    render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ghost" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Danger" })).toBeInTheDocument();
  });

  it("renders badge and status badge semantic variants", () => {
    render(
      <div>
        <Badge variant="PASS">PASS</Badge>
        <Badge variant="FAIL">FAIL</Badge>
        <Badge variant="INFO">INFO</Badge>
        <Badge variant="WARNING">WARNING</Badge>
        <Badge variant="SUCCESS">SUCCESS</Badge>
        <Badge variant="ERROR">ERROR</Badge>
        <StatusBadge status="PASS" />
        <StatusBadge label="healthy" status="SUCCESS" />
      </div>,
    );

    expect(screen.getAllByText("PASS").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    expect(screen.getByText("INFO")).toBeInTheDocument();
    expect(screen.getByText("WARNING")).toBeInTheDocument();
    expect(screen.getByText("ERROR")).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("renders card, tag, divider, skeleton, empty state, tabs, and table", () => {
    render(
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Surface card</CardTitle>
          </CardHeader>
          <CardContent>
            <Tag>Tagged</Tag>
            <Divider />
            <Skeleton data-testid="skeleton" className="h-4 w-24" />
          </CardContent>
        </Card>
        <EmptyState description="Nothing here yet." title="Empty" />
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">Panel one</TabsContent>
        </Tabs>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Row value</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>,
    );

    expect(screen.getByText("Surface card")).toBeInTheDocument();
    expect(screen.getByText("Tagged")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.getByText("Panel one")).toBeInTheDocument();
    expect(screen.getByText("Row value")).toBeInTheDocument();
  });
});
