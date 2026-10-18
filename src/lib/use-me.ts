import { useQuery } from "@tanstack/react-query";
import { meQuery, type Me } from "./crm";
export function useMe(): Me {
  return useQuery(meQuery).data as Me;
}
