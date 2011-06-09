from casexml.apps.phone.models import SyncLog
import logging
from dimagi.utils.couch.database import get_db
from casexml.apps.phone import xml
from datetime import datetime

def generate_restore_payload(user, restore_id=""):
    """
    Gets an XML payload suitable for OTA restore. If you need to do something
    other than find all cases matching user_id = user.user_id then you have
    to pass in a user object that overrides the get_open_cases() method.
    
    It should match the same signature as models.user.get_open_cases():
    
        args:    sync token
        returns: list of (CommCareCase, previously_synced) tuples
    """
    last_sync = None
    if restore_id:
        try:
            last_sync = SyncLog.get(restore_id)
        except Exception:
            logging.error("Request for bad sync log %s by %s, ignoring..." % (restore_id, user))
    
    cases_to_send = user.get_open_cases(last_sync)
    case_xml_blocks = [xml.get_case_xml(case, create) for case, create in cases_to_send]
    
    saved_case_ids = [case.case_id for case, _ in cases_to_send]
    last_seq = get_db().info()["update_seq"]
    
    # create a sync log for this
    previous_log_id = last_sync.get_id if last_sync else None
    synclog = SyncLog(user_id=user.user_id, last_seq=last_seq,
                      date=datetime.utcnow(), previous_log_id=previous_log_id,
                      cases=saved_case_ids)
    synclog.save()
    
    reg_xml = xml.get_registration_xml(user)
    
    return xml.get_response("Successfully restored account %s!" % user.username, 
                            xml.RESTOREDATA_TEMPLATE % {"registration": reg_xml, 
                                                        "sync_info": xml.get_sync_xml(synclog.get_id), 
                                                        "case_list": "".join(case_xml_blocks)})
