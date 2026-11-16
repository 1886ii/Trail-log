package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.PO.BookPO;
import org.example.trai.entity.PO.UserCurrentReadPO;
import org.example.trai.entity.VO.CurrentReadBookVO;
import org.example.trai.mapper.BookMapper;
import org.example.trai.mapper.BookTagMapper;
import org.example.trai.mapper.UserChapterReadMapper;
import org.example.trai.mapper.UserCurrentReadMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserCurrentReadService {
    @Resource
    private BookMapper bookMapper;

    @Resource
    private BookTagMapper bookTagMapper;

    @Resource
    private UserCurrentReadMapper userCurrentReadMapper;

    @Resource
    private UserChapterReadMapper userChapterReadMapper;

    public CurrentReadBookVO getCurrentReadBook(Long userId) {
        UserCurrentReadPO userCurrentReadPO = userCurrentReadMapper.queryByUserId(userId);
        CurrentReadBookVO vo = new CurrentReadBookVO();
        if (userCurrentReadPO == null) return vo;

        // 还需要补充 bookName cover author tagName grade unitName chapterCount description
        BookPO bookPO = bookMapper.queryByBookId(userCurrentReadPO.getBookId());
        if (bookPO == null || bookPO.getBookTagId() == null) return vo;


        // 查询tagName
        String tagName = bookTagMapper.queryTagNameById(bookPO.getBookTagId());

        // 只能获取到 id, bookId, chapterId, sortId, lastReadTime
        BeanUtils.copyProperties(userCurrentReadPO, vo);

        // 补充bookName cover author tagName grade unitName chapterCount description
        vo.setBookName(bookPO.getBookName());
        vo.setCover(bookPO.getCover());
        vo.setAuthor(bookPO.getAuthor());
        vo.setTagName(tagName);
        vo.setGrade(bookPO.getGrade());
        vo.setUnitName(bookPO.getUnitName());
        vo.setChapterCount(bookPO.getChapterCount());
        vo.setDescription(bookPO.getDescription());

        // 补充已经读完的章节
        Integer done = userChapterReadMapper.queryDoneByUserIdAndBookId(userId, bookPO.getId());
        vo.setDone(done);

        return vo;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean changeCurrentRead(Long bookId, Long userId) {
        // 有在读 没新读   有在读有新读
        // 无在读 有新都   无在读没新读
        UserCurrentReadPO cur = userCurrentReadMapper.queryByUserId(userId);
        if (cur == null || !bookId.equals(cur.getBookId())) {
            if (cur != null) userCurrentReadMapper.retireById(cur.getId());
            userCurrentReadMapper.activateByBook(userId, bookId);
        }

        if (cur != null) userCurrentReadMapper.retireById(cur.getId());         // 退役旧书，不判行数
        return true;
    }
}
