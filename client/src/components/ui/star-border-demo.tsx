import { cn } from "@/lib/utils"
import { StarBorder } from "@/components/ui/star-border"

export function StarBorderDemo() {
  return (
    <div className="space-y-8 p-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">StarBorder Component Demo</h2>
        <p className="text-muted-foreground">Animated star border components with theme awareness</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Default StarBorder */}
        <StarBorder>
          Theme-aware Border
        </StarBorder>

  {/* Slabfy Blue Gradient StarBorder - matches bg-primary-button */}
        <StarBorder 
          color="hsl(223, 100%, 61.8%)"
          className="bg-primary-button text-primary-foreground"
        >
          Slabfy Blue Gradient
        </StarBorder>

        {/* Another Slabfy variant with second gradient color */}
        <StarBorder 
          color="hsl(220, 83%, 53.7%)"
          speed="4s"
        >
          Slabfy Dark Blue
        </StarBorder>

        {/* Fast animation */}
        <StarBorder speed="2s" color="hsl(var(--success))">
          Fast Animation
        </StarBorder>

        {/* Slow animation */}
        <StarBorder speed="10s" color="hsl(var(--warning))">
          Slow Animation
        </StarBorder>

        {/* As a div instead of button */}
        <StarBorder as="div" color="hsl(var(--destructive))">
          Div Element
        </StarBorder>

        {/* Custom styling */}
        <StarBorder 
          className="text-lg font-bold"
          color="hsl(var(--accent))"
          speed="4s"
        >
          Custom Styled
        </StarBorder>
      </div>
    </div>
  )
}
