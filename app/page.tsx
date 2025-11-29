'use client'
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import DataTable from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import data from "@/lib/data.json";

export default function Home() {
  const columns = [
    {
      header: "Name",
      accessorKey: "header",
    },
    {
      header: "Type",
      accessorKey: "type",
    },
    {
      header: "Status",
      accessorKey: "status",
    },
    {
      header: "Target",
      accessorKey: "target",
    },
    {
      header: "Limit",
      accessorKey: "limit",
    },
    {
      header: "Reviewer",
      accessorKey: "reviewer",
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: ({  }) => {
        // const doctor = row.original;
        return (
          <div className="flex justify-center gap-2">
            <Button variant="default">View</Button>
            <Button variant="outline">Edit</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        );
      },
    },
  ]
  return (
    <div className="">
      <SectionCards />
       <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} columns={columns} search="type" />
            </div>
     
    </div>
  );
}
