"use client"

export default function PageHeader() {


  return (
    <div className="flex flex-col space-y-8">
      <div className="text-center space-y-4 cursor-pointer" onClick={() => window.open("/home", "_self")}>
        <h1 className="text-4xl font-bold tracking-tight">
          LiveATC Caption
        </h1>
        <p className="text-lg text-muted-foreground">
          A simple and easy to use caption generator for LiveATC
        </p>
      </div>
    </div>
  );
}