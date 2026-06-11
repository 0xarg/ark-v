import { CustomNotFound } from "@/components/custom-not-found"

export default function NotFound() {
  return (
    <CustomNotFound
      title="This page does not exist"
      description="The route you requested could not be found."
    />
  )
}
