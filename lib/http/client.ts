import axios from "axios";

import { getAppBaseUrl } from "@/lib/http/base-url";

export const api = axios.create({
  baseURL: getAppBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

