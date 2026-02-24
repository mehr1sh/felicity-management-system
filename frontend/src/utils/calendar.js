import { createEvent } from "ics";

export function generateCalendarEvent(event) {
  const startDate = new Date(event.eventStartDate);
  const endDate = new Date(event.eventEndDate);
  
  const start = [
    startDate.getFullYear(),
    startDate.getMonth() + 1,
    startDate.getDate(),
    startDate.getHours(),
    startDate.getMinutes(),
  ];
  
  const end = [
    endDate.getFullYear(),
    endDate.getMonth() + 1,
    endDate.getDate(),
    endDate.getHours(),
    endDate.getMinutes(),
  ];

  const eventData = {
    start,
    end,
    title: event.eventName,
    description: event.eventDescription,
    location: event.organizerId?.organizerName || "Event Location",
    status: "CONFIRMED",
    busyStatus: "BUSY",
  };

  return new Promise((resolve, reject) => {
    createEvent(eventData, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

export function downloadCalendarFile(icsContent, filename) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename || "event.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getGoogleCalendarLink(event) {
  const start = encodeURIComponent(new Date(event.eventStartDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z");
  const end = encodeURIComponent(new Date(event.eventEndDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z");
  const title = encodeURIComponent(event.eventName);
  const details = encodeURIComponent(event.eventDescription);
  const location = encodeURIComponent(event.organizerId?.organizerName || "");
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export function getOutlookCalendarLink(event) {
  const start = encodeURIComponent(new Date(event.eventStartDate).toISOString());
  const end = encodeURIComponent(new Date(event.eventEndDate).toISOString());
  const subject = encodeURIComponent(event.eventName);
  const body = encodeURIComponent(event.eventDescription);
  const location = encodeURIComponent(event.organizerId?.organizerName || "");
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&startdt=${start}&enddt=${end}&body=${body}&location=${location}`;
}
