package iuh.fit.se.ChatApp.utils;

import org.springframework.stereotype.Component;
import lombok.Data;
import java.util.Date;
import java.util.Calendar;

@Component
public class DateUtils {
    private static final long DAY_MILLISECONDS = 86400000L;
    private static final long HOUR_MILLISECONDS = 3600000L;
    private static final long MINUTE_MILLISECONDS = 60000L;

    @Data
    public static class DateObject {
        private int day;
        private int month;
        private int year;
    }

    @Data
    public static class DateObjectFull {
        private int year;
        private int month;
        private int day;
        private int hours;
        private int minutes;
        private int seconds;
    }

    /**
     * Convert Date to DateObject
     */
    public DateObject toObject(Date date) {
        if (date == null) return null;

        Calendar cal = Calendar.getInstance();
        cal.setTime(date);

        DateObject dateObj = new DateObject();
        dateObj.setDay(cal.get(Calendar.DATE));
        dateObj.setMonth(cal.get(Calendar.MONTH) + 1);
        dateObj.setYear(cal.get(Calendar.YEAR));

        return dateObj;
    }

    /**
     * Convert string to Date
     */
    public Date toDate(String dateString) {
        if (dateString == null || dateString.trim().isEmpty()) {
            return null;
        }
        try {
            return new Date(dateString);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Convert DateObject to Date
     */
    public Date toDateFromObject(DateObject dateObj) {
        if (dateObj == null) return null;

        String dateString = String.format("%d-%d-%d",
                dateObj.getYear(),
                dateObj.getMonth(),
                dateObj.getDay());

        return toDate(dateString);
    }

    /**
     * Convert Date to DateObjectFull
     */
    public DateObjectFull toObjectFull(Date date) {
        if (date == null) return null;

        Calendar cal = Calendar.getInstance();
        cal.setTime(date);

        DateObjectFull dateObj = new DateObjectFull();
        dateObj.setYear(cal.get(Calendar.YEAR));
        dateObj.setMonth(cal.get(Calendar.MONTH) + 1);
        dateObj.setDay(cal.get(Calendar.DATE));
        dateObj.setHours(cal.get(Calendar.HOUR_OF_DAY));
        dateObj.setMinutes(cal.get(Calendar.MINUTE));
        dateObj.setSeconds(cal.get(Calendar.SECOND));

        return dateObj;
    }

    /**
     * Convert Date to relative time string
     */
    public String toTime(Date date) {
        if (date == null) return "";

        Calendar calNow = Calendar.getInstance();
        Calendar calDate = Calendar.getInstance();
        calDate.setTime(date);

        // So sánh năm
        if (calNow.get(Calendar.YEAR) - calDate.get(Calendar.YEAR) > 0) {
            return String.format("%d/%d/%d",
                    calDate.get(Calendar.DATE),
                    calDate.get(Calendar.MONTH) + 1,
                    calDate.get(Calendar.YEAR));
        }

        // So sánh với 7 ngày trước
        Calendar sevenDaysAgo = Calendar.getInstance();
        sevenDaysAgo.add(Calendar.DATE, -7);

        if (date.before(sevenDaysAgo.getTime())) {
            return String.format("%d/%d",
                    calDate.get(Calendar.DATE),
                    calDate.get(Calendar.MONTH) + 1);
        }

        Date now = new Date();
        long diffMillis = now.getTime() - date.getTime();

        // Tính số ngày
        long days = diffMillis / DAY_MILLISECONDS;
        if (days > 0) {
            return days + " ngày";
        }

        // Tính số giờ
        long hours = diffMillis / HOUR_MILLISECONDS;
        if (hours > 0) {
            return hours + " giờ";
        }

        // Tính số phút
        long minutes = diffMillis / MINUTE_MILLISECONDS;
        if (minutes > 0) {
            return minutes + " phút";
        }

        return "Vài giây";
    }
}