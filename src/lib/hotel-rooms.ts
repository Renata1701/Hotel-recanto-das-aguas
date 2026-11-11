import type { State } from "@/lib/domain";

export type HotelRoom = {
  number: string;
  floor: number;
  label: string;
};

/** Quartos do hotel (demonstração). */
export const HOTEL_ROOMS: HotelRoom[] = [
  { number: "201", floor: 2, label: "Standard casal" },
  { number: "202", floor: 2, label: "Standard duplo" },
  { number: "203", floor: 2, label: "Standard vista jardim" },
  { number: "204", floor: 2, label: "Standard casal" },
  { number: "205", floor: 2, label: "Luxo piscina" },
  { number: "206", floor: 2, label: "Luxo família" },
  { number: "207", floor: 2, label: "Standard duplo" },
  { number: "208", floor: 2, label: "Suíte master" },
  { number: "209", floor: 2, label: "Standard casal" },
  { number: "210", floor: 2, label: "Luxo varanda" },
  { number: "301", floor: 3, label: "Bangalô premium" },
  { number: "302", floor: 3, label: "Bangalô premium" },
  { number: "303", floor: 3, label: "Suíte hidromassagem" },
];

export type RoomAvailability = HotelRoom & {
  status: "livre" | "ocupado";
  stayId?: string | undefined;
};

export function listRoomAvailability(state: State): RoomAvailability[] {
  const openByRoom = new Map<string, string>();
  for (const st of state.stays) {
    if (st.status !== "encerrada" && st.room) {
      openByRoom.set(st.room, st.id);
    }
  }
  return HOTEL_ROOMS.map((room) => {
    const stayId = openByRoom.get(room.number);
    return {
      ...room,
      status: stayId ? "ocupado" : "livre",
      stayId,
    };
  });
}

export function availableRooms(state: State): HotelRoom[] {
  return listRoomAvailability(state).filter((r) => r.status === "livre");
}
