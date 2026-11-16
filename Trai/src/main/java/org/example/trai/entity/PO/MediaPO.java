package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MediaPO {
    private Long id;
    private String url;
    private Integer bytes;
    private Long ownerId;
    private Integer width;
    private Integer height;
    private LocalDateTime createTime;
    private Integer state;
}
