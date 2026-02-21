import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/api/dashboard/:path*", "/api/clients/:path*", "/api/schedules/:path*", "/api/workouts/:path*", "/api/settings/:path*", "/api/upload/:path*", "/api/portal/:path*", "/api/availability/:path*", "/api/booking/:path*", "/api/messages/:path*", "/api/check-ins/:path*", "/api/habits/:path*", "/api/workout-logs/:path*", "/api/notifications/:path*", "/api/meal-plans/:path*", "/api/nutrition-logs/:path*", "/api/exercise-library/:path*", "/api/food-library/:path*", "/api/payments/:path*"],
};
